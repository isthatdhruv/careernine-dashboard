import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

// Returns the pipeline's working `input.xlsx` (produced by Phase 5 /
// 05_data_enrichment.py) EXACTLY as it was written — all sheets intact,
// bytes unchanged. Used by the dashboard "Generate Master Sheet" flow after
// phases 0,1,2,3,5 complete. We only parse the sheet names to confirm Phase 5
// actually produced the Master_Sheet; the file itself is streamed verbatim.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language') === 'hindi' ? 'hindi' : 'english';

    const projectRoot = process.cwd();
    const dir = language === 'hindi' ? 'report-gen-hindi' : 'report-gen-english';
    const filePath = path.join(projectRoot, dir, 'input.xlsx');

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: 'Working file not found. Run the pipeline (phases 0-5) first.' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    // Sanity check only: confirm Phase 5 wrote the Master_Sheet. We read sheet
    // names cheaply and do NOT rebuild the workbook, so the downloaded file is
    // the untouched Phase 5 output with every sheet preserved.
    const SHEET = 'Master_Sheet';
    const { SheetNames } = XLSX.read(fileBuffer, { type: 'buffer', bookSheets: true });
    if (!SheetNames.includes(SHEET)) {
      return NextResponse.json(
        {
          error: `'${SHEET}' sheet not found in ${dir}/input.xlsx. Phase 5 (Data Enrichment) may not have completed successfully.`,
        },
        { status: 404 }
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const downloadName = `Master_Sheet_${language}_${date}.xlsx`;

    // Stream the original file bytes unchanged (all sheets intact).
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating master sheet download:', error);
    return NextResponse.json(
      { error: 'Failed to generate master sheet', details: error.message },
      { status: 500 }
    );
  }
}
