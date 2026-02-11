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
      if (!data) {
         // Default behavior: run on input.xlsx in report-gen-english
         const projectRoot = process.cwd();
         const reportGenDir = path.join(projectRoot, 'report-gen-english');
         const pythonPath = path.join(reportGenDir, '.venv', 'bin', 'python');
         const scriptPath = path.join(reportGenDir, '00_data_normalizer.py');
         // Default input file might be 'input.xlsx' or 'harvest school.xlsx' depending on script.
         // The original code used 'harvest school.xlsx'. Let's stick to that or 'input.xlsx'.
         // Let's check what file exists there.
         const inputFile = path.join(reportGenDir, 'input.xlsx'); 
         
         const command = `"${pythonPath}" "${scriptPath}" "${inputFile}"`;
         console.log('Executing command (default):', command);
         const { stdout, stderr } = await execAsync(command, { timeout: 120_000 });
         return NextResponse.json({ success: true, output: stdout, error: stderr });
      }
    }

    // Define paths
    const projectRoot = process.cwd();
    const reportGenDir = path.join(projectRoot, 'report-gen-english');
    const timestamp = Date.now();
    const tempInputFile = path.join(reportGenDir, `temp_input_${timestamp}.xlsx`);
    
    // Create Excel file from data
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data'); 
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(tempInputFile, buffer);
    console.log('Created temp file:', tempInputFile);

    // Use the python executable from the virtual environment
    const pythonPath = path.join(reportGenDir, '.venv', 'bin', 'python');
    const scriptPath = path.join(reportGenDir, '00_data_normalizer.py');
    
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
