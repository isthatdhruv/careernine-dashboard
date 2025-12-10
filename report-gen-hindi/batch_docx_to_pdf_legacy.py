#!/usr/bin/env python3
"""
Batch DOCX to PDF Converter
Converts all DOCX reports to PDF using Microsoft Word and AppleScript
Handles folder-level permissions to avoid per-file permission prompts
"""

import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

REPORTS_BASE = Path("/Users/easylearning/Downloads/report-gen/Reports/hindi")

def find_docx_folders(base_dir):
    """Find all folders containing DOCX files"""
    docx_folders = set()
    
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.docx') and not file.startswith('~$'):
                docx_folders.add(root)
                break
    
    return sorted(docx_folders)

def convert_folder(folder_path, skip_existing=True):
    """
    Convert all DOCX files in a folder to PDF
    Uses AppleScript to automate Microsoft Word
    Activate Word once per folder, then process files sequentially
    """
    folder_path = Path(folder_path)
    docx_files = [f for f in folder_path.iterdir() 
                  if f.suffix == '.docx' and not f.name.startswith('~$')]
    
    if not docx_files:
        print(f"  ⚠️  No DOCX files found in {folder_path.name}")
        return 0, 0
    
    # Create PDFs subfolder
    pdf_folder = folder_path / "PDFs"
    pdf_folder.mkdir(exist_ok=True)
    
    # Filter files that need conversion
    files_to_convert = []
    skipped = 0
    
    for docx_file in sorted(docx_files):
        pdf_file = pdf_folder / f"{docx_file.stem}.pdf"
        if skip_existing and pdf_file.exists():
            skipped += 1
            print(f"    ⏭️  {docx_file.name} (PDF already exists)")
        else:
            files_to_convert.append((docx_file, pdf_file))
    
    if not files_to_convert:
        return 0, skipped
    
    converted = 0
    
    # Process files one at a time
    for docx_file, pdf_file in files_to_convert:
        # AppleScript to convert DOCX to PDF - one file at a time
        # Activate Word, wait a moment, then open and convert
        script = f'''
        tell application "Microsoft Word"
            activate
            delay 0.5
            try
                set docPath to POSIX file "{docx_file.resolve()}"
                set pdfPath to POSIX file "{pdf_file.resolve()}"
                
                open docPath
                delay 0.3
                
                set theDoc to active document
                save as theDoc file name pdfPath file format format PDF
                close theDoc saving no
                
                return "success"
            on error errMsg
                try
                    if exists active document then
                        close active document saving no
                    end if
                end try
                return "error: " & errMsg
            end try
        end tell
        '''
        
        try:
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=90
            )
            
            if result.returncode == 0 and "success" in result.stdout:
                converted += 1
                print(f"    ✅ {docx_file.name} → PDF", flush=True)
            else:
                error_msg = result.stderr.strip() or result.stdout.strip()
                print(f"    ❌ {docx_file.name}: {error_msg}", flush=True)
                
        except subprocess.TimeoutExpired:
            print(f"    ⏱️  {docx_file.name}: Timeout (may still be converting)", flush=True)
            # Try to close any open document
            try:
                subprocess.run(['osascript', '-e', 'tell application "Microsoft Word" to close active document saving no'], 
                             timeout=5, capture_output=True)
            except:
                pass
        except Exception as e:
            print(f"    ❌ {docx_file.name}: {e}", flush=True)
    
    return converted, skipped

def main():
    """Main conversion function"""
    import sys
    
    # Parse arguments
    process_all = '--all' in sys.argv
    priority_only = '--priority-only' in sys.argv
    skip_prompt = '--yes' in sys.argv or '-y' in sys.argv
    specific_folder = None
    
    # Check for specific school/folder argument
    target_school = None
    for arg in sys.argv:
        arg_lower = arg.lower()
        if 'ramkatora' in arg_lower:
            target_school = 'Ramkatora'
            break
        elif 'rohania' in arg_lower:
            target_school = 'Rohania'
            break
        elif 'pahariya' in arg_lower or 'paharia' in arg_lower:
            if 'Class9' in arg or 'class9' in arg.lower():
                specific_folder = REPORTS_BASE / "Pahariya" / "Class9"
                break
    
    print("=" * 70)
    print("📄 Batch DOCX to PDF Converter")
    print("=" * 70)
    
    if target_school:
        print(f"🎯 Processing ALL classes for: {target_school}")
        folders = find_docx_folders(REPORTS_BASE)
        folders = [f for f in folders if target_school in f]
    elif specific_folder and specific_folder.exists():
        print(f"🎯 Processing SPECIFIC folder: {specific_folder.relative_to(REPORTS_BASE)}")
        folders = [str(specific_folder)]
    elif priority_only:
        print("🎯 Processing PRIORITY folders: Pahariya & Sigra (ALL classes)")
        priority_schools = ['Pahariya', 'Sigra']
        folders = find_docx_folders(REPORTS_BASE)
        # Filter to priority schools (all classes)
        folders = [f for f in folders if any(school in f for school in priority_schools)]
    elif process_all:
        print("🌐 Processing ALL report folders")
        folders = find_docx_folders(REPORTS_BASE)
    else:
        # Default: Pahariya Class9 only
        specific_folder = REPORTS_BASE / "Pahariya" / "Class9"
        if specific_folder.exists():
            print(f"🎯 Processing: Pahariya/Class9")
            folders = [str(specific_folder)]
        else:
            print("🎯 Processing PRIORITY folders: Pahariya & Sigra (Class 9 & 10)")
            print("   (Use --all to process all folders, --priority-only for same behavior)")
            priority_schools = ['Pahariya', 'Sigra']
            folders = find_docx_folders(REPORTS_BASE)
            folders = [f for f in folders if any(school in f for school in priority_schools)]
            folders = [f for f in folders if 'Class9' in f or 'Class10' in f]
    
    if not folders:
        print("❌ No folders with DOCX files found!")
        return
    
    print(f"\n📊 Found {len(folders)} folder(s) to process")
    
    # Show folder list
    print("\n📋 Folders to process:")
    for i, folder in enumerate(folders, 1):
        docx_count = len([f for f in os.listdir(folder) if f.endswith('.docx') and not f.startswith('~$')])
        print(f"   {i}. {os.path.relpath(folder, REPORTS_BASE)} ({docx_count} DOCX files)")
    
    print("\n⚠️  Note: macOS may ask for folder access permission once per folder.")
    print("   Please grant access when prompted to avoid per-file prompts.\n")
    
    if not skip_prompt:
        input("Press Enter to start conversion (or Ctrl+C to cancel)...")
    else:
        print("🚀 Starting conversion automatically...\n")
    
    total_folders = len(folders)
    total_converted = 0
    total_skipped = 0
    
    for i, folder in enumerate(folders, 1):
        print(f"\n{'=' * 70}")
        print(f"Folder {i}/{total_folders}: {os.path.relpath(folder, REPORTS_BASE)}")
        print(f"{'=' * 70}")
        try:
            converted, skipped = convert_folder(folder, skip_existing=True)
            total_converted += converted
            total_skipped += skipped
            print(f"  📊 Converted: {converted}, Skipped: {skipped}")
        except KeyboardInterrupt:
            print("\n\n⚠️  Conversion interrupted by user")
            break
        except Exception as e:
            print(f"\n❌ Error processing folder {folder}: {e}")
            continue
    
    print("\n" + "=" * 70)
    print("✅ Batch conversion completed!")
    print(f"   Total converted: {total_converted}")
    print(f"   Total skipped (already exist): {total_skipped}")
    print("=" * 70)

if __name__ == "__main__":
    main()


