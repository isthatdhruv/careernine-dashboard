import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import { verifyAdmin } from '@/app/lib/admin-auth';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const authError = verifyAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !Array.isArray(data)) {
      // Fallback to default behavior if no data provided (run on harvest school.xlsx)
      // Or return error? Let's keep the old behavior as fallback or error.
      // But the user specifically asked for selected students.
      // If no data is sent, we can assume "run on all/default file" or error.
      // Let's support the old behavior if data is missing, for backward compatibility or "run on all" button if we keep it.
      // But for now, let's focus on the new requirement.
      if (!data) {
         // Old behavior
         const projectRoot = process.cwd();
         const pythonPath = path.join(projectRoot, 'report-gen', '.venv', 'bin', 'python');
         const scriptPath = path.join(projectRoot, 'report-gen', '00_data_normalizer.py');
         const inputFile = path.join(projectRoot, 'report-gen', 'harvest school.xlsx');
         const command = `"${pythonPath}" "${scriptPath}" "${inputFile}"`;
         console.log('Executing command (default):', command);
         const { stdout, stderr } = await execAsync(command, { timeout: 120_000 });
         return NextResponse.json({ success: true, output: stdout, error: stderr });
      }
    }

    // Define paths
    const projectRoot = process.cwd();
    const reportGenDir = path.join(projectRoot, 'report-gen');
    const timestamp = Date.now();
    const tempInputFile = path.join(reportGenDir, `temp_input_${timestamp}.xlsx`);
    
    // Create Excel file from data
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data'); // Sheet name matching what normalizer expects or just default
    // Normalizer looks for 'suitability_index', 'Student Data', 'Data', 'Sheet1'
    
    // Write to temp file
    // XLSX.writeFile(wb, tempInputFile);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(tempInputFile, buffer);
    console.log('Created temp file:', tempInputFile);

    // Use the python executable from the virtual environment
    const pythonPath = path.join(projectRoot, 'report-gen', '.venv', 'bin', 'python');
    const scriptPath = path.join(projectRoot, 'report-gen', '00_data_normalizer.py');
    
    // Construct command
    const command = `"${pythonPath}" "${scriptPath}" "${tempInputFile}"`;
    
    console.log('Executing command:', command);

    const { stdout, stderr } = await execAsync(command, { timeout: 120_000 });

    // Cleanup temp file
    try {
      await fs.unlink(tempInputFile);
      console.log('Deleted temp file:', tempInputFile);
    } catch (cleanupError) {
      console.warn('Failed to delete temp file:', cleanupError);
    }

    if (stderr) {
      console.warn('Script stderr:', stderr);
    }

    return NextResponse.json({ 
      success: true, 
      output: stdout,
      error: stderr 
    });

  } catch (error: any) {
    console.error('Error running normalizer script:', error);
    return NextResponse.json(
      { error: 'Failed to run normalizer script', details: error.message },
      { status: 500 }
    );
  }
}
