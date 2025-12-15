import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { generatePdfFromHtml } from '@/utils/pdfGenerator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportPaths } = body;

    if (!reportPaths || !Array.isArray(reportPaths) || reportPaths.length === 0) {
      return NextResponse.json({ error: 'reportPaths array is required' }, { status: 400 });
    }

    const zip = new JSZip();
    const projectRoot = process.cwd();

    // Helper to check existence
    const checkExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    // Process each report path
    for (const reportPath of reportPaths) {
      // Resolve full path (reusing logic from download-pdf)
      let fullPath = path.resolve(path.join(projectRoot, 'report-gen-english'), reportPath);
      let fileExists = false;

      if (await checkExists(fullPath)) {
        fileExists = true;
      } else {
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
          const pdfBuffer = await generatePdfFromHtml(fullPath);
          const filename = path.basename(fullPath, '.html') + '.pdf';
          zip.file(filename, pdfBuffer);
        } catch (err) {
          console.error(`Failed to generate PDF for ${reportPath}:`, err);
          // Optionally add an error log file to the zip
          zip.file(`error_${path.basename(reportPath)}.txt`, `Failed to generate PDF: ${err}`);
        }
      } else {
        console.error(`File not found: ${reportPath}`);
        zip.file(`error_${path.basename(reportPath)}.txt`, `File not found: ${reportPath}`);
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(content as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="reports.zip"',
      },
    });

  } catch (error: any) {
    console.error('Error generating batch zip:', error);
    return NextResponse.json(
      { error: 'Failed to generate batch zip', details: error.message },
      { status: 500 }
    );
  }
}
