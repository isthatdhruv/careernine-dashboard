import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { generatePdfFromHtml } from '@/utils/pdfGenerator';
import { verifyAdmin } from '@/app/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authError = verifyAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const reportPath = searchParams.get('path');

    if (!reportPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Security check: Ensure path is within allowed directories
    const projectRoot = process.cwd();
    const allowedDirs = [
      path.join(projectRoot, 'report-gen-english'),
      path.join(projectRoot, 'report-gen-hindi'),
      path.join(projectRoot, 'Reports')
    ];

    // Helper to check existence
    const checkExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    // Resolve the full path.
    // We try to resolve against multiple possible base directories to be robust.
    // 1. Try resolving against report-gen-english (legacy/default behavior)
    // 2. Try resolving against projectRoot (if path is relative to root)
    
    let fullPath = path.resolve(path.join(projectRoot, 'report-gen-english'), reportPath);
    let fileExists = false;

    if (await checkExists(fullPath)) {
      fileExists = true;
    } else {
      // Try resolving against project root
      const altPath = path.resolve(projectRoot, reportPath);
      if (await checkExists(altPath)) {
        fullPath = altPath;
        fileExists = true;
      } else {
        // Try resolving against report-gen-hindi if it looks like a hindi report
        // This covers cases where path might be relative to report-gen-hindi but passed to this endpoint
        const hindiPath = path.resolve(path.join(projectRoot, 'report-gen-hindi'), reportPath);
        if (await checkExists(hindiPath)) {
          fullPath = hindiPath;
          fileExists = true;
        }
      }
    }

    // Check if fullPath starts with any allowed directory
    const isAllowed = allowedDirs.some(dir => fullPath.startsWith(dir));

    if (!isAllowed && !fileExists) {
       console.error(`Access denied or file not found: ${fullPath}`);
       return NextResponse.json({ error: 'Invalid path or file not found' }, { status: 404 });
    }
    
    if (!fileExists) {
       return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Generate PDF using shared utility
    const pdfBuffer = await generatePdfFromHtml(fullPath);

    // Return PDF
    const filename = path.basename(fullPath, '.html') + '.pdf';
    
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
