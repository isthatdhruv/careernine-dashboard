import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Map phases to script names and descriptions
const PHASE_CONFIG: Record<number, { script: string; description: string; validation?: boolean }> = {
  0: { script: '00_data_normalizer.py', description: 'Data Normalization' },
  1: { script: '01_core_analysis.py', description: 'Core Analysis' },
  2: { script: '02_career_pathway_analysis.py', description: 'Career Pathway Analysis', validation: true },
  3: { script: '03_career_matching.py', description: 'Career Matching' },
  4: { script: '04_ai_summaries.py', description: 'AI Summaries' },
  5: { script: '05_data_enrichment.py', description: 'Data Enrichment', validation: true },
  6: { script: '06_generate_reports.py', description: 'Report Generation' },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phase, data, language } = body;

    if (typeof phase !== 'number' || !PHASE_CONFIG[phase]) {
      return NextResponse.json(
        { error: 'Invalid phase number' },
        { status: 400 }
      );
    }

    const config = PHASE_CONFIG[phase];
    const projectRoot = process.cwd();
    
    // Determine directory based on language
    const reportGenDirName = language === 'hindi' ? 'report-gen-hindi' : 'report-gen-english';
    const reportGenDir = path.join(projectRoot, reportGenDirName);
    
    const pythonPath = path.join(reportGenDir, '.venv', 'bin', 'python');
    const scriptPath = path.join(reportGenDir, config.script);

    let command = `"${pythonPath}" "${scriptPath}"`;
    let tempInputFile = '';

    // Phase 0 specific logic: Handle input data
    if (phase === 0) {
      if (!data || !Array.isArray(data)) {
        return NextResponse.json(
          { error: 'Data is required for Phase 0' },
          { status: 400 }
        );
      }
      
      console.log('Phase 0 Data Type:', typeof data);
      console.log('Phase 0 Data Is Array:', Array.isArray(data));
      if (Array.isArray(data) && data.length > 0) {
        console.log('Phase 0 Data First Row Type:', typeof data[0]);
        console.log('Phase 0 Data First Row Is Array:', Array.isArray(data[0]));
        console.log('Phase 0 Data Sample:', JSON.stringify(data.slice(0, 1)));
      }

      const timestamp = Date.now();
      tempInputFile = path.join(reportGenDir, `temp_input_${timestamp}.xlsx`);
      
      // Create Excel file from data
      const wb = XLSX.utils.book_new();
      let ws;
      
      if (Array.isArray(data[0])) {
        // Handle Array of Arrays
        ws = XLSX.utils.aoa_to_sheet(data);
      } else {
        // Handle Array of Objects
        ws = XLSX.utils.json_to_sheet(data);
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      await fs.writeFile(tempInputFile, buffer);
      console.log('Created temp file for Phase 0:', tempInputFile);

      // Pass temp file as argument to normalizer
      command += ` "${tempInputFile}"`;
    }

    // Phase 4 specific logic: Add resume flag
    if (phase === 4) {
      command += ' --resume';
    }

    console.log(`Executing Phase ${phase} (${config.description}):`, command);

    // Execute the main script
    const { stdout, stderr } = await execAsync(command, { cwd: reportGenDir });
    
    let output = stdout;
    let error = stderr;

    // Cleanup temp file for Phase 0
    if (phase === 0 && tempInputFile) {
      try {
        await fs.unlink(tempInputFile);
        console.log('Deleted temp file:', tempInputFile);
      } catch (cleanupError) {
        console.warn('Failed to delete temp file:', cleanupError);
      }
    }

    // Run validation if configured (after Phase 2 and 5)
    if (config.validation) {
      const validationScript = path.join(reportGenDir, '00_validate_pathway_data.py');
      const valCommand = `"${pythonPath}" "${validationScript}"`;
      console.log(`Running validation for Phase ${phase}:`, valCommand);
      
      try {
        const valResult = await execAsync(valCommand, { cwd: reportGenDir });
        output += '\n\n--- Validation Output ---\n' + valResult.stdout;
        if (valResult.stderr) {
          error += '\nValidation Error: ' + valResult.stderr;
        }
      } catch (valError: any) {
        console.warn('Validation failed:', valError);
        error += '\nValidation Script Failed: ' + valError.message;
      }
    }

    // Parse JSON_RESULT for Phase 6
    let generatedReports = [];
    if (phase === 6) {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('JSON_RESULT:')) {
          try {
            const jsonStr = line.split('JSON_RESULT:')[1];
            generatedReports = JSON.parse(jsonStr);
            
            // Update reports_metadata.json
            if (generatedReports.length > 0) {
              const metadataPath = path.join(projectRoot, 'reports_metadata.json');
              let metadata = [];
              try {
                const content = await fs.readFile(metadataPath, 'utf-8');
                metadata = JSON.parse(content);
              } catch {
                // File might not exist or be empty
              }
              
              // Append new reports
              // Add language and timestamp if missing from script output
              const newReports = generatedReports.map((r: any) => ({
                ...r,
                language: language || 'english',
                generatedAt: new Date().toISOString()
              }));
              
              metadata = [...newReports, ...metadata]; // Add new ones at top
              
              await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
              console.log('Updated reports_metadata.json with', newReports.length, 'reports');
            }
          } catch (e) {
            console.warn('Failed to parse JSON_RESULT or update metadata:', e);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      output: output,
      error: error,
      generatedReports: generatedReports
    });

  } catch (error: any) {
    console.error('Error running pipeline phase:', error);
    return NextResponse.json(
      { error: 'Failed to run pipeline phase', details: error.message },
      { status: 500 }
    );
  }
}
