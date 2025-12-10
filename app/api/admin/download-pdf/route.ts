import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
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

    // Read HTML content
    const htmlContent = await fs.readFile(fullPath, 'utf-8');

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some environments
    });
    const page = await browser.newPage();

    const fileUrl = `file://${fullPath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

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
