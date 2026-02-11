'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  ArrowUpTrayIcon, 
  DocumentTextIcon, 
  ArrowDownTrayIcon, 
  EyeIcon,
  LanguageIcon,
  TrashIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

function getAdminPassword(): string {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('adminPassword') || '';
  }
  return '';
}

// --- Types ---
interface Report {
  student_name: string; // From Python script
  studentName?: string; // Fallback/Metadata
  school: string;
  class: string; // "Class 9" etc.
  filename: string;
  path: string; // Relative path
  reportPath?: string; // Fallback/Metadata
  language: string;
  generatedAt: string;
}

// --- Constants & Helper Functions (Migrated from Dashboard) ---
// --- Constants & Helper Functions (Migrated from Google Apps Script) ---
const CAREER_LABELS = [
  "Architecture", "Art, Design", "Entertainment and Mass Media ", "Management and Administration",
  "Banking and Finance", "Law Studies ", "Government and Public Administration", "Marketing ",
  "Entrepreneurship", "Sales", "Science and Mathematics", "Computer Science, IT and Allied Fields ",
  "Life Sciences /Medicine and Healthcare", "Environmental Service", "Social Sciences and Humanities",
  "Defence/ Protective Service", "Sports", "Engineering and Technology", "Agriculture, Food Industry and Forestry ",
  "Education and Training", "Paramedical", "Hospitality and Tourism  ", "Community and Social Service",
  "Personal Care and Services "
];

const VALUE_LABELS = [
  "Lucrative Salary", "Job Security ", "Variety and Diversity", "Building Relations", "High achievement",
  "Autonomy", "Hands on activities", "Prestige/ Recognition", "Creativity", "Mental Activity",
  "Physical Activity", "Leadership", "Routine Activity", "Supervised Work ", "Working Conditions"
];

const SOI_LABELS = [
  "Agriculture", "Art", "Cultural Studies", "English", "Home and Consumer Science", "Finance",
  "Health", "Languages", "Management", "Mathematics", "Music", "Science", "Vocational studies",
  "Social Sciences", "Technology"
];

const MI_LABELS = [
  "Bodily-Kinesthetic ", "Interpersonal ", "Intrapersonal ", "Linguistic ",
  "Logical-Mathematical ", "Musical ", "Visual-Spatial", "Naturalistic "
];

const APT_LABELS = [
  "Speed and accuracy ", "Computational", "Creativity /Artistic ", "Language/ Communication ",
  "Technical ", "Decision making & problem solving ", "Finger dexterity ", "Form perception ",
  "Logical reasoning ", "Motor movement "
];

const E_WEIGHTS: {[key: string]: number} = { "A": 4, "B": 3, "C": 3, "D": 1 };
const F_WEIGHTS: {[key: string]: number} = { "A": 4, "B": 3, "C": 2, "D": 1 };

const E_GROUPS: {[key: string]: number[]} = {
  "Speed and accuracy ": [1, 11, 21],
  "Computational": [2, 12, 22],
  "Creativity /Artistic ": [3, 13, 23],
  "Language/ Communication ": [4, 14, 24],
  "Technical ": [5, 15, 25],
  "Decision making & problem solving ": [6, 16, 26],
  "Finger dexterity ": [7, 17, 27],
  "Form perception ": [8, 18, 28],
  "Logical reasoning ": [9, 19, 29],
  "Motor movement ": [10, 20, 30]
};

const RIASEC_LETTERS = ["R", "I", "A", "S", "E", "C"];

// Helper: normalize cell value to string
const norm = (val: any) => {
  if (val === null || val === undefined) return "";
  return String(val).trim().toUpperCase();
};

// Helper: check if selected (for Sec_A/B/C: 1, "1", YES, Y)
const isSelected = (val: any) => {
  const v = norm(val);
  return (v === "1" || v === "YES" || v === "Y");
};

const generateMasterSheetData = (rawData: any[][]): { data: any[], logs: string[] } => {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  if (!rawData || rawData.length < 2) {
    log("Error: Raw data is empty or has no header row.");
    return { data: [], logs };
  }

  log(`Found ${rawData.length} rows in raw data.`);

  const header = rawData[0];
  const colIndex: {[key: string]: number} = {};
  header.forEach((name, idx) => {
    colIndex[String(name).trim()] = idx;
  });

  const idx = (name: string) => {
    const i = colIndex[name];
    if (i === undefined) {
      // Only log missing critical columns once to avoid spam
      // log(`Warning: Column '${name}' not found.`);
      return -1;
    }
    return i;
  };

  // Check critical columns
  const criticalCols = ["Roll Number", "Name", "Class", "School", "Section"];
  const missingCols = criticalCols.filter(c => idx(c) === -1);
  if (missingCols.length > 0) {
    log(`CRITICAL: Missing columns: ${missingCols.join(", ")}`);
    return { data: [], logs };
  } else {
    log("All critical columns found.");
  }

  const masterData = [];
  let processedCount = 0;
  let skippedCount = 0;

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    // Skip completely empty rows (no roll number)
    const rollIdx = idx("Roll Number");
    if (rollIdx === -1) continue; 
    
    const roll = row[rollIdx];
    if (roll === "" || roll === null || roll === undefined) {
      skippedCount++;
      continue;
    }

    const school = row[idx("School")];
    const section = row[idx("Section")];
    const name = row[idx("Name")];
    const clazz = row[idx("Class")];

    // ---------- Section F: Multiple Intelligence ----------
    const miScores = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let q = 1; q <= 24; q++) {
      const colNameF = "Sec_F_" + q;
      const cIdxF = idx(colNameF);
      if (cIdxF !== -1) {
        const ansF = norm(row[cIdxF]);
        const wF = F_WEIGHTS[ansF] || 0;
        const groupIndex = Math.floor((q - 1) / 3);
        miScores[groupIndex] += wF;
      }
    }

    // ---------- Section E: Aptitude ----------
    const aptScores: {[key: string]: number} = {};
    APT_LABELS.forEach(label => aptScores[label] = 0);

    for (const label in E_GROUPS) {
      const indices = E_GROUPS[label];
      let sum = 0;
      for (const qE of indices) {
        const colNameE = "Sec_E_" + qE;
        const cIdxE = idx(colNameE);
        if (cIdxE !== -1) {
          const ansE = norm(row[cIdxE]);
          const wE = E_WEIGHTS[ansE] || 0;
          sum += wE;
        }
      }
      aptScores[label] = sum;
    }

    // ---------- Section D: RIASEC ----------
    const riaSecScores: {[key: string]: number} = { "R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0 };
    for (let d = 1; d <= 54; d++) {
      const colNameD = "Sec_D_" + d;
      const cIdxD = idx(colNameD);
      if (cIdxD !== -1) {
        const ansD = norm(row[cIdxD]);
        let wD = 0;
        if (ansD === "YES") wD = 2;
        else if (ansD === "NO") wD = 1;
        
        const riIndex = (d - 1) % 6;
        const letter = RIASEC_LETTERS[riIndex];
        riaSecScores[letter] += wD;
      }
    }

    // ---------- Section C: SOI top 5 ----------
    const soiList: string[] = [];
    for (let c = 1; c <= 15; c++) {
      const colNameC = "Sec_C_" + c;
      const cIdxC = idx(colNameC);
      if (cIdxC !== -1 && isSelected(row[cIdxC])) {
        soiList.push(SOI_LABELS[c - 1]);
      }
    }
    while (soiList.length < 5) soiList.push("");

    // ---------- Section B: Work Values top 5 ----------
    const valList: string[] = [];
    for (let b = 1; b <= 15; b++) {
      const colNameB = "Sec_B_" + b;
      const cIdxB = idx(colNameB);
      if (cIdxB !== -1 && isSelected(row[cIdxB])) {
        valList.push(VALUE_LABELS[b - 1]);
      }
    }
    while (valList.length < 5) valList.push("");

    // ---------- Section A: Career Aspirations top 5 ----------
    const careerList: string[] = [];
    for (let a = 1; a <= 24; a++) {
      const colNameA = "Sec_A_" + a;
      const cIdxA = idx(colNameA);
      if (cIdxA !== -1 && isSelected(row[cIdxA])) {
        careerList.push(CAREER_LABELS[a - 1]);
      }
    }
    while (careerList.length < 5) careerList.push("");

    // Construct Master Row Object
    const masterRow: any = {
      "School": school,
      "Section": section,
      "Roll Number": roll,
      "Name": name,
      "Class": clazz,
    };

    MI_LABELS.forEach((label, i) => masterRow[label] = miScores[i]);
    APT_LABELS.forEach((label) => masterRow[label] = aptScores[label]);
    ["R","I","A","S","E","C"].forEach(l => masterRow[l] = riaSecScores[l]);
    
    soiList.slice(0, 5).forEach((v, i) => masterRow[`SOI ${i+1}`] = v);
    valList.slice(0, 5).forEach((v, i) => masterRow[`Value ${i+1}`] = v);
    careerList.slice(0, 5).forEach((v, i) => masterRow[`Career Aspiration ${i+1}`] = v);

    masterData.push(masterRow);
    processedCount++;
  }

  log(`Processing complete. Processed: ${processedCount}, Skipped: ${skippedCount} (empty rows).`);
  return { data: masterData, logs };
};


export default function ReportsPage() {
  const [activeLanguage, setActiveLanguage] = useState<'english' | 'hindi'>('english');
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  
  // OMR State
  const [showOmrModal, setShowOmrModal] = useState(false);
  const [omrData, setOmrData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline State
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [pipelineState, setPipelineState] = useState<{[key: number]: { status: 'pending' | 'running' | 'success' | 'error', logs: string }}>({});
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  // Fetch Reports
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/admin/list-reports', {
        headers: { 'X-Admin-Password': getAdminPassword() },
      });
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter State
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Filtered Reports
  const filteredReports = reports.filter(r => {
    const matchesLanguage = (r.language || 'english').toLowerCase() === activeLanguage;
    const matchesSchool = selectedSchool === 'all' || r.school === selectedSchool;
    const matchesClass = selectedClass === 'all' || r.class === selectedClass;
    return matchesLanguage && matchesSchool && matchesClass;
  });

  // Unique Filter Options
  const uniqueSchools = Array.from(new Set(reports.map(r => r.school).filter(Boolean))).sort();
  const uniqueClasses = Array.from(new Set(reports.map(r => r.class).filter(Boolean))).sort();

  const [omrLogs, setOmrLogs] = useState<string[]>([]);

  // OMR Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingReports(true);
    setOmrLogs([]); // Reset logs

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const { data: processedData, logs } = generateMasterSheetData(data);
        setOmrLogs(logs);
        
        if (processedData.length === 0) {
          alert("No valid student data found. Check the logs for details.");
          setShowOmrModal(true); // Show modal anyway to see logs
        } else {
          setOmrData(processedData);
          setShowOmrModal(true);
        }
      } catch (error: any) {
        console.error("Error processing file:", error);
        alert("Failed to process Excel file.");
        setOmrLogs(prev => [...prev, `CRITICAL ERROR: ${error.message}`]);
        setShowOmrModal(true);
      } finally {
        setLoadingReports(false);
      }
    };
    reader.onerror = () => {
      alert("Error reading file.");
      setLoadingReports(false);
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset
  };

  // Helper to append logs
  const appendLog = (phase: number, text: string) => {
    setPipelineState(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        logs: (prev[phase]?.logs || "") + text
      }
    }));
  };

  // Helper to set status
  const setStatus = (phase: number, status: 'pending' | 'running' | 'success' | 'error') => {
    setPipelineState(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        status
      }
    }));
  };

  // Run Single Phase
  const runPhase = async (phase: number, language: 'english' | 'hindi', data?: any[]) => {
    setStatus(phase, 'running');
    appendLog(phase, `\n--- Starting Phase ${phase} (${language}) ---\n`);
    
    try {
      const payload: any = { phase, language };
      if (phase === 0 && data) {
        payload.data = data;
      }

      const res = await fetch('/api/admin/run-pipeline-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || `Phase ${phase} failed`);
      }

      appendLog(phase, (result.output || "") + `\nPhase ${phase} Completed Successfully.\n`);
      setStatus(phase, 'success');
      return true;
    } catch (error: any) {
      appendLog(phase, `\nERROR: ${error.message}\n`);
      setStatus(phase, 'error');
      return false;
    }
  };

  // Run Full Pipeline
  const runPipeline = async (language: 'english' | 'hindi') => {
    setIsNormalizing(true);
    setShowPipelineModal(true);
    
    // Reset State
    const initialState: any = {};
    for(let i=0; i<=6; i++) initialState[i] = { status: 'pending', logs: '' };
    setPipelineState(initialState);

    try {
      // Phase 0
      const success0 = await runPhase(0, language, omrData);
      if (!success0) throw new Error("Phase 0 failed");

      // Phases 1-6
      for (let i = 1; i <= 6; i++) {
        const success = await runPhase(i, language);
        if (!success) throw new Error(`Phase ${i} failed`);
      }

      fetchReports(); // Refresh list
    } catch (error: any) {
      console.error("Pipeline stopped due to error:", error);
    } finally {
      setIsNormalizing(false);
    }
  };

  // Rerun Handler
  const handleRerunPhase = async (phase: number) => {
    if (isNormalizing) return; // Prevent concurrent runs
    const language = activeLanguage; // Use currently selected language
    
    // Reset logs for this phase only
    setPipelineState(prev => ({
      ...prev,
      [phase]: { status: 'pending', logs: '' }
    }));

    setIsNormalizing(true);
    try {
      await runPhase(phase, language, phase === 0 ? omrData : undefined);
      if (phase === 6) fetchReports();
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleDownloadMasterSheet = () => {
    if (omrData.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(omrData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Sheet");
    
    XLSX.writeFile(wb, "Processed_Master_Sheet.xlsx");
  };

  // Batch Download Handler
  const handleBatchDownload = async () => {
    if (selectedReports.size === 0) return;
    setIsDownloadingBatch(true);

    try {
      const reportPaths = Array.from(selectedReports);
      const res = await fetch('/api/admin/download-batch-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() },
        body: JSON.stringify({ reportPaths }),
      });

      if (!res.ok) throw new Error('Failed to generate zip');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_batch_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Clear selection after successful download
      setSelectedReports(new Set());
    } catch (error) {
      console.error('Batch download failed:', error);
      alert('Failed to download batch reports. Please try again.');
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  // Drive Upload Handler
  const handleDriveUpload = async () => {
    if (selectedReports.size === 0) return;
    
    const folderName = prompt("Enter a name for the Google Drive folder:", `Reports_Batch_${new Date().toISOString().split('T')[0]}`);
    if (folderName === null) return; // User cancelled

    const parentFolderId = prompt("Enter Parent Folder ID (Optional - leave empty for root):", "");

    setIsUploadingToDrive(true);

    try {
      const reportPaths = Array.from(selectedReports);
      const res = await fetch('/api/admin/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() },
        body: JSON.stringify({ reportPaths, folderName, parentFolderId }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Failed to upload to Drive');

      if (result.success && result.folderUrl) {
        // Check for partial failures
        const errors = result.results.filter((r: any) => r.status === 'error');
        if (errors.length > 0) {
          const quotaError = errors.find((r: any) => r.error && r.error.includes('QUOTA_ERROR'));
          if (quotaError) {
             alert(quotaError.error);
          } else {
             alert(`Upload completed with some errors. Check console for details.`);
          }
        }
        
        // Show success message with link (using a simple alert for now, or could be a modal)
        // A prompt is useful here so user can copy the link easily
        prompt("Upload Process Finished! Copy the Google Drive Folder Link below:", result.folderUrl);
        
        // Clear selection
        setSelectedReports(new Set());
      } else {
        alert("Upload completed but no folder link returned.");
      }

    } catch (error: any) {
      console.error('Drive upload failed:', error);
      alert(`Failed to upload to Drive: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const toggleReportSelection = (path: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedReports(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      const allPaths = new Set(filteredReports.map(r => r.reportPath || r.path));
      setSelectedReports(allPaths);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
          <p className="text-sm text-gray-500">Manage OMR data and generate student reports</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
            <button
              onClick={() => setActiveLanguage('english')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeLanguage === 'english' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLanguage('hindi')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeLanguage === 'hindi' 
                  ? 'bg-orange-50 text-orange-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Hindi
            </button>
          </div>

          {/* OMR Upload */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx, .xls"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
            Upload OMR Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">School:</label>
          <select
            value={selectedSchool}
            onChange={(e) => {
              setSelectedSchool(e.target.value);
              setSelectedReports(new Set()); // Clear selection on filter change
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Schools</option>
            {uniqueSchools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedReports(new Set()); // Clear selection on filter change
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Classes</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        
        {(selectedSchool !== 'all' || selectedClass !== 'all') && (
          <button
            onClick={() => {
              setSelectedSchool('all');
              setSelectedClass('all');
              setSelectedReports(new Set());
            }}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Report List Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-500" />
            Generated Reports ({activeLanguage === 'english' ? 'English' : 'Hindi'})
          </h3>
          <div className="flex items-center gap-4">
            {selectedReports.size > 0 && (
              <button 
                onClick={handleBatchDownload}
                disabled={isDownloadingBatch}
                className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isDownloadingBatch ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Zipping...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                    Download Selected ({selectedReports.size})
                  </>
                )}
              </button>
            )}
            {selectedReports.size > 0 && (
              <button 
                onClick={handleDriveUpload}
                disabled={isUploadingToDrive}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploadingToDrive ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-4 h-4 mr-1" />
                    Upload to Drive
                  </>
                )}
              </button>
            )}
            <button onClick={fetchReports} className="text-sm text-indigo-600 hover:text-indigo-800">
              Refresh List
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input 
                    type="checkbox" 
                    checked={filteredReports.length > 0 && selectedReports.size === filteredReports.length}
                    onChange={toggleAllSelection}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingReports ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
                      Loading reports...
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No {activeLanguage} reports found. Upload OMR data to generate.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedReports.has(report.reportPath || report.path)}
                        onChange={() => toggleReportSelection(report.reportPath || report.path)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.studentName || report.student_name}</div>
                      <div className="text-xs text-gray-500">{report.filename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.school || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.class || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button 
                        onClick={() => alert("View functionality coming soon")}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="View Report"
                      >
                        <EyeIcon className="w-5 h-5 inline" />
                      </button>
                      <a 
                        href={`/api/admin/download-pdf?path=${encodeURIComponent(report.reportPath || report.path)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Download PDF"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 inline" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OMR Processing Modal */}
      {showOmrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Master Sheet Preview</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Raw data has been processed. Only Master Sheet data is used for generation.
                </p>
              </div>
              <button onClick={() => setShowOmrModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1 flex flex-col gap-6">
              {/* Logs Section */}
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto border border-gray-700">
                <h3 className="font-bold text-gray-400 mb-2 uppercase">Processing Logs</h3>
                {omrLogs.length > 0 ? (
                  omrLogs.map((log, i) => <div key={i}>{log}</div>)
                ) : (
                  <div className="text-gray-500">No logs available.</div>
                )}
              </div>

              {/* Data Preview Section */}
              <div className="flex-1 overflow-auto border rounded-lg">
                {omrData.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(omrData[0]).slice(0, 15).map((header) => (
                          <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-gray-50">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {omrData.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).slice(0, 15).map((val: any, i) => (
                            <td key={i} className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 border-r">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No data processed. Check logs above for errors.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-4">
              <button
                onClick={handleDownloadMasterSheet}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Download Master Sheet
              </button>
              <button
                onClick={() => setShowOmrModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => runPipeline('english')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Generate English Reports
              </button>
              <button
                onClick={() => runPipeline('hindi')}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Generate Hindi Reports
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Progress Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col text-gray-100 font-mono">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                {isNormalizing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Pipeline Execution ({activeLanguage})
              </h3>
              {!isNormalizing && (
                <button onClick={() => setShowPipelineModal(false)} className="text-gray-400 hover:text-white">
                  Close
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Phase List & Controls */}
              <div className="w-full md:w-1/3 border-r border-gray-700 overflow-y-auto p-2 bg-gray-800">
                {[0, 1, 2, 3, 4, 5, 6].map(phase => {
                  const state = pipelineState[phase] || { status: 'pending', logs: '' };
                  const labels = [
                    "Data Normalizer", "Core Analysis", "Career Pathway", 
                    "Career Matching", "AI Summaries", "Data Enrichment", "Report Generation"
                  ];
                  
                  return (
                    <div key={phase} className={`p-3 mb-2 rounded border ${
                      state.status === 'running' ? 'border-blue-500 bg-blue-900/20' :
                      state.status === 'success' ? 'border-green-600 bg-green-900/20' :
                      state.status === 'error' ? 'border-red-600 bg-red-900/20' :
                      'border-gray-700 bg-gray-800'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm">Phase {phase}</span>
                        {state.status === 'running' && <span className="text-xs text-blue-400 animate-pulse">Running...</span>}
                        {state.status === 'success' && <span className="text-xs text-green-400">Success</span>}
                        {state.status === 'error' && <span className="text-xs text-red-400">Failed</span>}
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{labels[phase]}</div>
                      
                      {/* Rerun Button */}
                      {(state.status === 'success' || state.status === 'error') && !isNormalizing && (
                        <button 
                          onClick={() => handleRerunPhase(phase)}
                          className="w-full py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowUpTrayIcon className="w-3 h-3" /> Rerun Phase
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Logs View */}
              <div className="flex-1 p-4 overflow-y-auto whitespace-pre-wrap text-xs bg-black">
                {Object.keys(pipelineState).map(key => {
                  const phase = parseInt(key);
                  const logs = pipelineState[phase]?.logs;
                  if (!logs) return null;
                  return (
                    <div key={phase} className="mb-4">
                      {logs}
                    </div>
                  );
                })}
                {Object.keys(pipelineState).length === 0 && (
                  <div className="text-gray-500 italic">Waiting to start pipeline...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
