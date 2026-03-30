import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs/promises';
import { generatePdfFromHtml } from '@/utils/pdfGenerator';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportPaths, folderName, parentFolderId } = body;

    if (!reportPaths || !Array.isArray(reportPaths) || reportPaths.length === 0) {
      return NextResponse.json({ error: 'reportPaths array is required' }, { status: 400 });
    }

    // 1. Authenticate using OAuth2 (user's personal Google account)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 2. Find existing folder or create new one
    const targetFolderName = folderName || `Reports_Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    let folderId: string | null | undefined = null;
    let folderUrl: string | null | undefined = null;

    // Search for existing folder with the same name
    const parentQuery = parentFolderId ? `and '${parentFolderId}' in parents` : '';
    const searchRes = await drive.files.list({
      q: `name = '${targetFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false ${parentQuery}`,
      fields: 'files(id, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id;
      folderUrl = searchRes.data.files[0].webViewLink;
      console.log(`[Drive] Found existing folder: "${targetFolderName}" (${folderId})`);
    } else {
      const folderMetadata: any = {
        name: targetFolderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentFolderId) {
        folderMetadata.parents = [parentFolderId];
      }
      const folderRes = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });
      folderId = folderRes.data.id;
      folderUrl = folderRes.data.webViewLink;
      console.log(`[Drive] Created new folder: "${targetFolderName}" (${folderId})`);
    }

    if (!folderId) {
      throw new Error('Failed to find or create Drive folder');
    }

    // 3. Get existing files in the folder to skip duplicates
    const existingFiles = new Set<string>();
    try {
      let pageToken: string | undefined;
      do {
        const listRes = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          pageSize: 1000,
          pageToken,
        });
        for (const file of listRes.data.files || []) {
          if (file.name) existingFiles.add(file.name);
        }
        pageToken = listRes.data.nextPageToken || undefined;
      } while (pageToken);
      console.log(`[Drive] Found ${existingFiles.size} existing files in folder`);
    } catch (listErr: any) {
      console.warn(`[Drive] Could not list existing files, will upload all: ${listErr.message}`);
    }

    // 4. Process and Upload Files
    const projectRoot = process.cwd();
    const checkExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    const uploadResults = [];
    let uploadedCount = 0;
    let skippedCount = 0;

    console.log(`[Drive] Starting upload of ${reportPaths.length} reports...`);

    for (const reportPath of reportPaths) {
      // Resolve path (reusing logic)
      let fullPath = path.resolve(path.join(projectRoot, 'report-gen-english'), reportPath);
      let fileExists = false;

      if (await checkExists(fullPath)) fileExists = true;
      else {
        const altPath = path.resolve(projectRoot, reportPath);
        if (await checkExists(altPath)) {
          fullPath = altPath;
          fileExists = true;
        } else {
          const hindiPath = path.resolve(path.join(projectRoot, 'report-gen-hindi'), reportPath);
          if (await checkExists(hindiPath)) {
            fullPath = hindiPath;
            fileExists = true;
          }
        }
      }

      if (fileExists) {
        const filename = path.basename(fullPath, '.html') + '.pdf';

        // Skip if file already exists in Drive folder
        if (existingFiles.has(filename)) {
          skippedCount++;
          console.log(`[Drive] SKIP (already exists): ${filename}`);
          uploadResults.push({ path: reportPath, status: 'skipped' });
          continue;
        }

        try {
          // Generate PDF
          const pdfBuffer = await generatePdfFromHtml(fullPath);

          console.log(`[Drive] Uploading PDF (${uploadedCount + 1}): ${filename}`);

          // Upload to Drive
          const fileMetadata = {
            name: filename,
            parents: [folderId],
          };

          const media = {
            mimeType: 'application/pdf',
            body: Readable.from(pdfBuffer),
          };

          await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true,
          });

          uploadedCount++;
          uploadResults.push({ path: reportPath, status: 'uploaded' });
        } catch (err: any) {
          console.error(`[Drive] FAILED to upload ${filename}: ${err.message}`);

          if (err.message.includes('Service Accounts do not have storage quota')) {
             uploadResults.push({
               path: reportPath,
               status: 'error',
               error: 'QUOTA_ERROR: Service Accounts cannot own files in regular Drive folders. Please use a Shared Drive (Team Drive) as the parent folder.'
             });
          } else {
             uploadResults.push({ path: reportPath, status: 'error', error: err.message });
          }
        }
      } else {
        console.warn(`[Drive] NOT FOUND: ${reportPath}`);
        uploadResults.push({ path: reportPath, status: 'not_found' });
      }
    }

    console.log(`[Drive] Done. Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Not found: ${uploadResults.filter(r => r.status === 'not_found').length}, Errors: ${uploadResults.filter(r => r.status === 'error').length}`);

    // 5. Make Folder Shareable (Anyone with link can read)
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.error('Failed to set folder permissions:', permErr);
      // Continue, as folder is created and files uploaded
    }

    return NextResponse.json({ 
      success: true, 
      folderUrl, 
      results: uploadResults 
    });

  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload to Drive', details: error.message },
      { status: 500 }
    );
  }
}
