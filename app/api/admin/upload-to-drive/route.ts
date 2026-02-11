import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs/promises';
import { generatePdfFromHtml } from '@/utils/pdfGenerator';
import { Readable } from 'stream';
import { verifyAdmin } from '@/app/lib/admin-auth';

export async function POST(req: NextRequest) {
  const authError = verifyAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { reportPaths, folderName, parentFolderId } = body;

    if (!reportPaths || !Array.isArray(reportPaths) || reportPaths.length === 0) {
      return NextResponse.json({ error: 'reportPaths array is required' }, { status: 400 });
    }

    // 1. Authenticate
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 2. Create Folder
    const folderMetadata: any = {
      name: folderName || `Reports_Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`,
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

    const folderId = folderRes.data.id;
    const folderUrl = folderRes.data.webViewLink;

    if (!folderId) {
      throw new Error('Failed to create Drive folder');
    }

    // 3. Process and Upload Files
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
        try {
          // Generate PDF
          const pdfBuffer = await generatePdfFromHtml(fullPath);
          const filename = path.basename(fullPath, '.html') + '.pdf';
          
          console.log(`Uploading PDF: ${filename}`);

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

          uploadResults.push({ path: reportPath, status: 'uploaded' });
        } catch (err: any) {
          console.error(`Failed to upload PDF for ${reportPath}:`, err.message);
          
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
        uploadResults.push({ path: reportPath, status: 'not_found' });
      }
    }

    // 4. Make Folder Shareable (Anyone with link can read)
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
