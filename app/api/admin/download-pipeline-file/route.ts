import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language') || 'english';
    const filename = searchParams.get('file') || 'input.xlsx';

    // Validate filename to prevent traversal and allow only specific files if needed
    // For now, allow input.xlsx and maybe others if needed, but ensure no path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const projectRoot = process.cwd();
    const dir = language === 'hindi' ? 'report-gen-hindi' : 'report-gen-english';
    const filePath = path.join(projectRoot, dir, filename);

    try {
        await fs.access(filePath);
    } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Processed_${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}
