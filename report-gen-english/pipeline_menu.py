#!/usr/bin/env python3
"""
Interactive Terminal Menu for Career Assessment Pipeline
Provides an easy-to-use menu interface for running phases and common workflows
"""

import os
import sys
import subprocess
import pandas as pd
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def clear_screen():
    """Clear terminal screen"""
    os.system('clear' if os.name != 'nt' else 'cls')

def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(70)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")

def print_menu(options):
    """Print a formatted menu"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}Select an option:{Colors.END}\n")
    for key, value in options.items():
        print(f"  {Colors.GREEN}{key}{Colors.END}. {value}")
    print()

def get_input(prompt):
    """Get user input with prompt"""
    return input(f"{Colors.CYAN}{prompt}{Colors.END}").strip()

def run_command(cmd, description):
    """Run a command and return success status"""
    print(f"\n{Colors.BLUE}Running: {description}{Colors.END}")
    print(f"{Colors.YELLOW}{'─'*70}{Colors.END}\n")
    
    try:
        result = subprocess.run(cmd, shell=False)
        if result.returncode == 0:
            print(f"\n{Colors.GREEN}✅ {description} completed successfully{Colors.END}\n")
            return True
        else:
            print(f"\n{Colors.RED}❌ {description} failed{Colors.END}\n")
            return False
    except Exception as e:
        print(f"\n{Colors.RED}❌ Error: {e}{Colors.END}\n")
        return False

def check_file_exists(filename):
    """Check if a file exists"""
    return os.path.exists(filename)

def find_excel_files():
    """Find Excel files in current directory"""
    excel_files = []
    for f in os.listdir('.'):
        if f.endswith('.xlsx') and not f.startswith('~$'):
            if f not in ['input.xlsx', 'student_reports_tracker.xlsx']:
                excel_files.append(f)
    return sorted(excel_files)

def get_input_file():
    """Get input file from user"""
    excel_files = find_excel_files()
    
    if not excel_files:
        print(f"{Colors.YELLOW}No Excel files found in current directory{Colors.END}")
        return None
    
    print(f"\n{Colors.BLUE}Available Excel files:{Colors.END}")
    for i, f in enumerate(excel_files, 1):
        print(f"  {i}. {f}")
    print(f"  {len(excel_files) + 1}. Enter custom path")
    
    choice = get_input(f"\nSelect file (1-{len(excel_files) + 1}): ")
    
    try:
        idx = int(choice) - 1
        if 0 <= idx < len(excel_files):
            return excel_files[idx]
        elif idx == len(excel_files):
            custom = get_input("Enter file path: ")
            if check_file_exists(custom):
                return custom
            else:
                print(f"{Colors.RED}File not found: {custom}{Colors.END}")
                return None
        else:
            print(f"{Colors.RED}Invalid selection{Colors.END}")
            return None
    except ValueError:
        print(f"{Colors.RED}Invalid input{Colors.END}")
        return None

def normalize_data():
    """Normalize a new Excel file"""
    print_header("PHASE 0: DATA NORMALIZATION")
    
    input_file = get_input_file()
    if not input_file:
        return False
    
    output_file = get_input("Output file (default: input.xlsx): ").strip()
    if not output_file:
        output_file = "input.xlsx"
    
    cmd = [sys.executable, '00_data_normalizer.py', input_file, '--output', output_file]
    return run_command(cmd, f"Normalizing {input_file}")

def run_phase(phase_num, script_name, description):
    """Run a specific phase"""
    print_header(f"PHASE {phase_num}: {description}")
    
    if not check_file_exists('input.xlsx'):
        print(f"{Colors.RED}❌ input.xlsx not found!{Colors.END}")
        print(f"{Colors.YELLOW}Please run Phase 0 (Data Normalization) first{Colors.END}")
        return False
    
    cmd = [sys.executable, script_name]
    
    # Add special flags for Phase 4
    if script_name == '04_ai_summaries.py':
        print(f"\n{Colors.YELLOW}Phase 4 Options:{Colors.END}")
        print("  1. Normal run")
        print("  2. Resume from previous run")
        print("  3. Force regenerate all")
        choice = get_input("Select option (1-3): ")
        
        if choice == '2':
            cmd.append('--resume')
        elif choice == '3':
            cmd.append('--force')
    
    return run_command(cmd, description)

def run_complete_pipeline():
    """Run the complete pipeline"""
    print_header("COMPLETE PIPELINE")
    
    if not check_file_exists('input.xlsx'):
        print(f"{Colors.RED}❌ input.xlsx not found!{Colors.END}")
        print(f"{Colors.YELLOW}Please run Phase 0 (Data Normalization) first{Colors.END}")
        return False
    
    print(f"{Colors.YELLOW}This will run all 6 phases in sequence.{Colors.END}")
    print(f"{Colors.YELLOW}This may take a while, especially Phase 4 (AI Summaries).{Colors.END}")
    confirm = get_input("\nContinue? (yes/no): ")
    
    if confirm.lower() not in ['yes', 'y']:
        print(f"{Colors.YELLOW}Cancelled{Colors.END}")
        return False
    
    cmd = [sys.executable, 'master_pipeline.py']
    return run_command(cmd, "Complete Pipeline")

def process_new_data():
    """Process new data file"""
    print_header("PROCESS NEW DATA")
    
    cmd = [sys.executable, 'process_new_data.py']
    return run_command(cmd, "Process New Data")

def regenerate_reports():
    """Regenerate reports"""
    print_header("REGENERATE REPORTS")
    
    cmd = [sys.executable, 'regenerate_reports.py']
    return run_command(cmd, "Regenerate Reports")

def convert_to_pdf():
    """Convert reports to PDF"""
    print_header("CONVERT REPORTS TO PDF")
    
    print("Options:")
    print("  1. Convert all reports")
    print("  2. Convert specific folder")
    choice = get_input("Select option (1-2): ")
    
    if choice == '1':
        cmd = [sys.executable, 'batch_docx_to_pdf.py', '--all', '--yes']
    elif choice == '2':
        folder = get_input("Enter folder path: ")
        cmd = [sys.executable, 'batch_docx_to_pdf.py', '--folder', folder]
    else:
        print(f"{Colors.RED}Invalid selection{Colors.END}")
        return False
    
    return run_command(cmd, "Convert to PDF")

def check_system_status():
    """Check system status"""
    print_header("SYSTEM STATUS")
    
    status = {
        'input.xlsx': check_file_exists('input.xlsx'),
        '.env': check_file_exists('.env'),
        'student_reports_tracker.xlsx': check_file_exists('student_reports_tracker.xlsx'),
    }
    
    # Check input.xlsx sheets if it exists
    if status['input.xlsx']:
        try:
            xl = pd.ExcelFile('input.xlsx')
            print(f"\n{Colors.GREEN}✅ input.xlsx exists{Colors.END}")
            print(f"   Sheets: {', '.join(xl.sheet_names)}")
            
            # Check for Master_Sheet (indicates Phase 5 completed)
            if 'Master_Sheet' in xl.sheet_names:
                df = pd.read_excel('input.xlsx', sheet_name='Master_Sheet')
                print(f"   Students in Master_Sheet: {len(df)}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️  Could not read input.xlsx: {e}{Colors.END}")
    else:
        print(f"\n{Colors.RED}❌ input.xlsx not found{Colors.END}")
    
    # Check .env file
    if status['.env']:
        print(f"\n{Colors.GREEN}✅ .env file exists{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  .env file not found (required for Phase 4){Colors.END}")
    
    # Check tracker
    if status['student_reports_tracker.xlsx']:
        try:
            df = pd.read_excel('student_reports_tracker.xlsx')
            print(f"\n{Colors.GREEN}✅ student_reports_tracker.xlsx exists{Colors.END}")
            print(f"   Tracked students: {len(df)}")
        except:
            print(f"\n{Colors.YELLOW}⚠️  student_reports_tracker.xlsx exists but could not be read{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  student_reports_tracker.xlsx not found (will be created automatically){Colors.END}")
    
    # Check Reports directory
    reports_dir = Path('Reports/english')
    if reports_dir.exists():
        report_count = len(list(reports_dir.rglob('*.docx')))
        print(f"\n{Colors.GREEN}✅ Reports directory exists{Colors.END}")
        print(f"   Generated reports: {report_count}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  Reports directory not found (will be created during Phase 6){Colors.END}")
    
    print()

def show_documentation():
    """Show documentation links"""
    print_header("DOCUMENTATION")
    
    docs = {
        '1': ('Main README', 'README.md'),
    }
    
    print(f"{Colors.BLUE}Available documentation:{Colors.END}\n")
    for key, (name, path) in docs.items():
        exists = "✅" if check_file_exists(path) else "❌"
        print(f"  {key}. {exists} {name} ({path})")
    
    print(f"\n{Colors.YELLOW}To view documentation, open the files listed above.{Colors.END}\n")

def main():
    """Main menu loop"""
    while True:
        clear_screen()
        print_header("CAREER ASSESSMENT PIPELINE MENU")
        
        menu_options = {
            '0': 'Phase 0: Data Normalization',
            '1': 'Phase 1: Core Analysis',
            '2': 'Phase 2: Career Pathway Analysis',
            '3': 'Phase 3: Career Matching',
            '4': 'Phase 4: AI Summaries',
            '5': 'Phase 5: Data Enrichment',
            '6': 'Phase 6: Report Generation',
            'A': 'Run Complete Pipeline (All Phases)',
            'B': 'Process New Data File',
            'C': 'Regenerate Reports',
            'D': 'Convert Reports to PDF',
            'S': 'Check System Status',
            'H': 'View Documentation',
            'Q': 'Quit'
        }
        
        print_menu(menu_options)
        
        choice = get_input("Enter your choice: ").upper()
        
        if choice == 'Q':
            print(f"\n{Colors.GREEN}Hasta la vista, baby!{Colors.END}\n")
            break
        elif choice == '0':
            normalize_data()
        elif choice == '1':
            run_phase(1, '01_core_analysis.py', 'Core Analysis')
        elif choice == '2':
            run_phase(2, '02_career_pathway_analysis.py', 'Career Pathway Analysis')
        elif choice == '3':
            run_phase(3, '03_career_matching.py', 'Career Matching')
        elif choice == '4':
            run_phase(4, '04_ai_summaries.py', 'AI Summaries')
        elif choice == '5':
            run_phase(5, '05_data_enrichment.py', 'Data Enrichment')
        elif choice == '6':
            run_phase(6, '06_generate_reports.py', 'Report Generation')
        elif choice == 'A':
            run_complete_pipeline()
        elif choice == 'B':
            process_new_data()
        elif choice == 'C':
            regenerate_reports()
        elif choice == 'D':
            convert_to_pdf()
        elif choice == 'S':
            check_system_status()
        elif choice == 'H':
            show_documentation()
        else:
            print(f"\n{Colors.RED}Invalid choice. Please try again.{Colors.END}")
        
        if choice != 'Q':
            input(f"\n{Colors.CYAN}Press Enter to continue...{Colors.END}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Interrupted by user{Colors.END}\n")
        sys.exit(0)

