#!/usr/bin/env python3
"""
Process New Student Data
Detects new Excel files and prompts to process them
"""

import os
import sys
import subprocess
import pandas as pd
from pathlib import Path
from datetime import datetime

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def find_student_data_files():
    """Find all Excel files that look like student data exports"""
    files = []
    for f in os.listdir('.'):
        if f.endswith('.xlsx') and not f.startswith('~$'):
            # Skip known files
            if f in ['input.xlsx', 'student_reports_tracker.xlsx']:
                continue
            # Skip backup files
            if 'backup' in f.lower() or f.startswith('input_backup'):
                continue
            # Skip files in subdirectories
            if os.path.isdir(f):
                continue
            files.append(f)
    return sorted(files)

def check_file_has_student_data(filepath):
    """Check if file contains student data (has Name and Class columns)"""
    try:
        xl_file = pd.ExcelFile(filepath)
        # Check first sheet
        df = pd.read_excel(xl_file, sheet_name=xl_file.sheet_names[0], nrows=5)
        cols_lower = [col.lower().strip() for col in df.columns]
        has_name = any('name' in col for col in cols_lower)
        has_class = any('class' in col for col in cols_lower)
        return has_name and has_class
    except:
        return False

def get_file_info(filepath):
    """Get information about the file"""
    try:
        xl_file = pd.ExcelFile(filepath)
        df = pd.read_excel(xl_file, sheet_name=xl_file.sheet_names[0])
        
        # Try to find Name column
        name_col = None
        for col in df.columns:
            if 'name' in col.lower():
                name_col = col
                break
        
        student_count = len(df) if name_col else 0
        file_size = os.path.getsize(filepath) / 1024  # KB
        modified_time = datetime.fromtimestamp(os.path.getmtime(filepath))
        
        return {
            'student_count': student_count,
            'file_size_kb': file_size,
            'modified': modified_time,
            'sheets': xl_file.sheet_names
        }
    except Exception as e:
        return {
            'student_count': 0,
            'file_size_kb': os.path.getsize(filepath) / 1024,
            'modified': datetime.fromtimestamp(os.path.getmtime(filepath)),
            'sheets': [],
            'error': str(e)
        }

def main():
    """Main function"""
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}NEW STUDENT DATA PROCESSOR{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")
    
    # Find potential student data files
    all_files = find_student_data_files()
    
    if not all_files:
        print(f"{Colors.YELLOW}No Excel files found in current directory{Colors.END}")
        print(f"\n{Colors.BLUE}To process new data:{Colors.END}")
        print("  1. Place your Excel export file in this directory")
        print("  2. Run this script again")
        return
    
    # Filter files that look like student data
    student_files = []
    for f in all_files:
        if check_file_has_student_data(f):
            student_files.append(f)
    
    if not student_files:
        print(f"{Colors.YELLOW}No student data files found{Colors.END}")
        print(f"\nFound Excel files (but they don't appear to be student data):")
        for f in all_files[:5]:
            print(f"  • {f}")
        if len(all_files) > 5:
            print(f"  ... and {len(all_files) - 5} more")
        return
    
    print(f"{Colors.GREEN}Found {len(student_files)} potential student data file(s):{Colors.END}\n")
    
    # Show file information
    for i, filepath in enumerate(student_files, 1):
        info = get_file_info(filepath)
        print(f"{Colors.BOLD}{i}. {filepath}{Colors.END}")
        print(f"   Students: {info['student_count']}")
        print(f"   Size: {info['file_size_kb']:.1f} KB")
        print(f"   Modified: {info['modified'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Sheets: {', '.join(info['sheets'][:3])}")
        if len(info['sheets']) > 3:
            print(f"            ... and {len(info['sheets']) - 3} more")
        print()
    
    # Ask which file to process
    if len(student_files) == 1:
        selected_file = student_files[0]
        print(f"{Colors.BLUE}Processing: {selected_file}{Colors.END}\n")
        selected_files = [selected_file]
    else:
        print(f"{Colors.CYAN}Which file would you like to process?{Colors.END}")
        print(f"Enter number (1-{len(student_files)}) or 'all' to process all:")
        
        selection = input("Selection: ").strip()
        
        if selection.lower() == 'all':
            selected_files = student_files
        else:
            try:
                idx = int(selection) - 1
                if 0 <= idx < len(student_files):
                    selected_files = [student_files[idx]]
                else:
                    print(f"{Colors.RED}Invalid selection{Colors.END}")
                    return
            except ValueError:
                print(f"{Colors.RED}Invalid selection{Colors.END}")
                return
    
    # Process each selected file
    for filepath in selected_files:
        print(f"\n{Colors.BOLD}{'='*70}{Colors.END}")
        print(f"{Colors.BOLD}Processing: {filepath}{Colors.END}")
        print(f"{Colors.BOLD}{'='*70}{Colors.END}\n")
        
        # Confirm
        print(f"{Colors.YELLOW}This will:{Colors.END}")
        print(f"  1. Normalize {filepath} → input.xlsx")
        print(f"  2. Run the full pipeline (6 phases)")
        print(f"  3. Generate reports for new students")
        print(f"  4. Create backups automatically")
        print()
        
        confirm = input(f"{Colors.CYAN}Continue? (yes/no): {Colors.END}").strip().lower()
        
        if confirm not in ['yes', 'y']:
            print(f"{Colors.YELLOW}Skipping {filepath}{Colors.END}\n")
            continue
        
        # Step 1: Normalize
        print(f"\n{Colors.BLUE}Step 1: Normalizing data...{Colors.END}")
        result = subprocess.run(
            [sys.executable, '00_data_normalizer.py', filepath],
            capture_output=False
        )
        
        if result.returncode != 0:
            print(f"{Colors.RED}❌ Normalization failed{Colors.END}")
            continue
        
        # Step 2: Run pipeline
        print(f"\n{Colors.BLUE}Step 2: Running pipeline...{Colors.END}")
        result = subprocess.run(
            [sys.executable, 'master_pipeline.py'],
            capture_output=False
        )
        
        if result.returncode == 0:
            print(f"\n{Colors.GREEN}✅ Successfully processed {filepath}!{Colors.END}")
        else:
            print(f"\n{Colors.RED}❌ Pipeline completed with errors{Colors.END}")
    
    print(f"\n{Colors.BOLD}{'='*70}{Colors.END}")
    print(f"{Colors.GREEN}Processing complete!{Colors.END}")
    print(f"{Colors.BOLD}{'='*70}{Colors.END}")

if __name__ == "__main__":
    main()

