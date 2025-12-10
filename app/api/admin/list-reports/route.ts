import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const projectRoot = process.cwd();
    const metadataPath = path.join(projectRoot, 'reports_metadata.json');

    try {
      await fs.access(metadataPath);
    } catch {
      // If file doesn't exist, return empty list
      return NextResponse.json({ reports: [] });
    }

    const fileContent = await fs.readFile(metadataPath, 'utf-8');
    const reports = JSON.parse(fileContent);

    // Sort by generatedAt desc
    reports.sort((a: any, b: any) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: 'Failed to list reports', details: error.message },
      { status: 500 }
    );
  }
}
