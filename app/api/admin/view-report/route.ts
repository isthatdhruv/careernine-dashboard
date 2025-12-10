import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportPath = searchParams.get('path');

    if (!reportPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Security check: Ensure path is within report-gen-english directory
    const projectRoot = process.cwd();
    const reportGenDir = path.join(projectRoot, 'report-gen-english');
    const fullPath = path.join(reportGenDir, reportPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(reportGenDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = await fs.readFile(fullPath, 'utf-8');

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error viewing report:', error);
    return NextResponse.json(
      { error: 'Failed to view report', details: error.message },
      { status: 500 }
    );
  }
}
