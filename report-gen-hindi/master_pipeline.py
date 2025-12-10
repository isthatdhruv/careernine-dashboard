#!/usr/bin/env python3
"""
MASTER PIPELINE - Career Assessment System
Orchestrates all 6 phases with checkpoints
"""

import subprocess
import sys
import os
import pandas as pd
from datetime import datetime
from student_tracker import load_tracker, filter_new_students, update_tracker_with_new_reports, save_tracker, get_class_group
from backup_utils import backup_input_file, backup_master_sheet

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(70)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")

def run_phase(phase_num, script_name, description, is_checkpoint=False):
    """Run a phase script and return success status"""
    print_header(f"PHASE {phase_num}: {description}")
    
    if is_checkpoint:
        print(f"{Colors.YELLOW}⚠️  CHECKPOINT: This phase requires review{Colors.END}")
        print()
    
    print(f"Running: {script_name}")
    print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    try:
        cmd = [sys.executable, script_name]
        # Add defaults for AI phase to make it resume-safe by default
        if script_name == '04_ai_summaries.py':
            cmd += ['--resume']
        result = subprocess.run(
            cmd,
            capture_output=False,  # Show output in real-time
            text=True
        )
        
        if result.returncode == 0:
            print(f"{Colors.GREEN}✅ Phase {phase_num} completed successfully{Colors.END}")
            
            # Run validation after Phase 2 or Phase 5
            if script_name == '02_career_pathway_analysis.py' or script_name == '05_data_enrichment.py':
                print()
                print(f"{Colors.BLUE}🔍 Running validation checks...{Colors.END}")
                validation_result = subprocess.run(
                    [sys.executable, '00_validate_pathway_data.py'],
                    capture_output=False,
                    text=True
                )
                if validation_result.returncode != 0:
                    print(f"{Colors.YELLOW}⚠️  Validation found issues - please review{Colors.END}")
            
            return True
        else:
            print(f"{Colors.RED}❌ Phase {phase_num} failed{Colors.END}")
            return False
            
    except Exception as e:
        print(f"{Colors.RED}❌ Error running phase {phase_num}: {e}{Colors.END}")
        return False

def checkpoint(phase_num):
    """Checkpoint - ask user to review before continuing"""
    print()
    print(f"{Colors.YELLOW}{'='*70}{Colors.END}")
    print(f"{Colors.YELLOW}CHECKPOINT AFTER PHASE {phase_num}{Colors.END}")
    print(f"{Colors.YELLOW}{'='*70}{Colors.END}")
    print()
    print("Please review the output above before continuing.")
    print()
    
    # In automated mode, continue automatically
    # In interactive mode, you can uncomment this to require user input:
    # response = input("Continue to next phase? (y/n): ")
    # if response.lower() != 'y':
    #     print("Pipeline stopped by user")
    #     return False
    
    print(f"{Colors.GREEN}Continuing to next phase...{Colors.END}")
    return True

def main():
    """Run the complete pipeline"""
    print_header("CAREER ASSESSMENT MASTER PIPELINE")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Input file: input.xlsx")
    print()
    
    # ============================================================================
    # STUDENT TRACKING SYSTEM
    # ============================================================================
    print(f"{Colors.BLUE}📊 STUDENT TRACKING SYSTEM{Colors.END}")
    print("=" * 50)
    
    # Load tracker
    tracker_df = load_tracker()
    
    # Load input data
    try:
        input_df = pd.read_excel('input.xlsx', sheet_name='suitability_index')
        print(f"📋 Input data: {len(input_df)} students")
        
        # Filter new students
        new_students_df, existing_students_df = filter_new_students(input_df, tracker_df)
        
        if new_students_df.empty:
            print(f"\n{Colors.YELLOW}⚠️  No new students to process!{Colors.END}")
            print("All students in input have already been processed.")
            print("To reprocess, delete entries from student_reports_tracker.xlsx")
            return True
        
        print(f"\n{Colors.GREEN}🆕 Processing {len(new_students_df)} new students:{Colors.END}")
        for _, row in new_students_df.iterrows():
            class_group = get_class_group(row.get('Class'))
            print(f"  • {row['Name']} (Class {row.get('Class')} → {class_group})")
        
        if not existing_students_df.empty:
            print(f"\n{Colors.BLUE}⏭️  Skipping {len(existing_students_df)} already processed students:{Colors.END}")
            for _, row in existing_students_df.iterrows():
                print(f"  • {row['Name']} (Class {row.get('Class')})")
        
        # Backup input.xlsx before overwriting
        print(f"\n{Colors.BLUE}💾 Creating backup of input.xlsx...{Colors.END}")
        backup_input_file("before filtering new students")
        
        # Update input.xlsx to only contain new students
        # IMPORTANT: Preserve all existing sheets, only update suitability_index
        try:
            # Read all existing sheets
            xl_file = pd.ExcelFile('input.xlsx')
            all_sheets = {}
            for sheet_name in xl_file.sheet_names:
                if sheet_name != 'suitability_index':
                    all_sheets[sheet_name] = pd.read_excel('input.xlsx', sheet_name=sheet_name)
            
            # Write all sheets back, updating only suitability_index
            with pd.ExcelWriter('input.xlsx', engine='openpyxl') as writer:
                # Write updated suitability_index
                new_students_df.to_excel(writer, sheet_name='suitability_index', index=False)
                # Write all other existing sheets
                for sheet_name, sheet_df in all_sheets.items():
                    sheet_df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            print(f"\n✅ Updated input.xlsx to process only new students")
            print(f"   Preserved {len(all_sheets)} existing sheet(s): {', '.join(all_sheets.keys()) if all_sheets else 'none'}")
        except Exception as e:
            # Fallback: if reading other sheets fails, just update suitability_index
            print(f"{Colors.YELLOW}⚠️  Could not preserve other sheets: {e}{Colors.END}")
            print(f"   Updating only suitability_index sheet...")
        new_students_df.to_excel('input.xlsx', sheet_name='suitability_index', index=False)
        print(f"\n✅ Updated input.xlsx to process only new students")
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error in tracking system: {e}{Colors.END}")
        print("Continuing with full processing...")
        new_students_df = None
    
    print()
    
    phases = [
        {
            'num': 1,
            'script': '01_core_analysis.py',
            'description': 'CORE ANALYSIS',
            'checkpoint': False
        },
        {
            'num': 2,
            'script': '02_career_pathway_analysis.py',
            'description': 'CAREER PATHWAY ANALYSIS',
            'checkpoint': False
        },
        {
            'num': 3,
            'script': '03_career_matching.py',
            'description': 'CAREER MATCHING',
            'checkpoint': False
        },
        {
            'num': 4,
            'script': '04_ai_summaries.py',
            'description': 'AI SUMMARIES',
            'checkpoint': True  # CHECKPOINT - Review AI output
        },
        {
            'num': 5,
            'script': '05_data_enrichment.py',
            'description': 'DATA ENRICHMENT',
            'checkpoint': False
        },
        {
            'num': 6,
            'script': '06_generate_reports.py',
            'description': 'REPORT GENERATION',
            'checkpoint': False
        }
    ]
    
    # Track progress
    completed = []
    failed = []
    
    # Check if we have any 6-8 students (skip career matching for them)
    has_6_8_students = False
    # Check both new students and all students in case tracking is disabled
    try:
        all_students_df = pd.read_excel('input.xlsx', sheet_name='suitability_index')
        for _, row in all_students_df.iterrows():
            class_group = get_class_group(row.get('Class'))
            if class_group == "6-8":
                has_6_8_students = True
                break
    except:
        pass
    
    # Run each phase
    for phase in phases:
        # Skip Phase 3 (Career Matching) for 6-8 students
        if phase['num'] == 3 and has_6_8_students:
            print(f"{Colors.BLUE}⏭️  Skipping Phase 3 (Career Matching) for 6-8 students{Colors.END}")
            print("  6-8 students don't have career aspirations, so no matching needed.")
            completed.append(phase['num'])
            continue
            
        success = run_phase(
            phase['num'],
            phase['script'],
            phase['description'],
            phase['checkpoint']
        )
        
        if success:
            completed.append(phase['num'])
            
            # Checkpoint if needed
            if phase['checkpoint']:
                if not checkpoint(phase['num']):
                    break
        else:
            failed.append(phase['num'])
            print(f"\n{Colors.RED}Pipeline stopped at Phase {phase['num']} due to error{Colors.END}")
            break
    
    # Final summary
    print_header("PIPELINE COMPLETE")
    
    print(f"Total phases run: {len(completed)}/6")
    print(f"Successful: {len(completed)}")
    if failed:
        print(f"{Colors.RED}Failed: {len(failed)} - Phase(s) {', '.join(map(str, failed))}{Colors.END}")
    
    print()
    
    # ============================================================================
    # UPDATE TRACKING SYSTEM
    # ============================================================================
    if len(completed) == 6 and new_students_df is not None:
        print(f"{Colors.BLUE}📊 UPDATING STUDENT TRACKER{Colors.END}")
        print("=" * 50)
        
        try:
            # Determine class group for new students
            class_groups = set()
            for _, row in new_students_df.iterrows():
                class_group = get_class_group(row.get('Class'))
                class_groups.add(class_group)
            
            # Update tracker for each class group
            for class_group in class_groups:
                group_students = new_students_df[new_students_df.apply(
                    lambda row: get_class_group(row.get('Class')) == class_group, axis=1
                )]
                
                if not group_students.empty:
                    tracker_df = update_tracker_with_new_reports(tracker_df, group_students, class_group)
                    print(f"  ✅ Updated tracker for {class_group} group: {len(group_students)} students")
            
            # Save updated tracker
            save_tracker(tracker_df)
            print(f"  ✅ Tracker updated successfully")
            
        except Exception as e:
            print(f"  {Colors.RED}❌ Error updating tracker: {e}{Colors.END}")
    
    # ============================================================================
    # BACKUP MASTER_SHEET AFTER SUCCESSFUL COMPLETION
    # ============================================================================
    if len(completed) == 6:
        print(f"\n{Colors.BLUE}💾 Creating backup of Master_Sheet...{Colors.END}")
        backup_master_sheet("after successful pipeline completion")
    
    print()
    
    if len(completed) == 6:
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL PHASES COMPLETED SUCCESSFULLY!{Colors.END}")
        print()
        print("📁 Output locations:")
        print("   • Master data: input.xlsx (Master_Sheet)")
        print("   • Reports: Reports/english/")
        print("   • Graphs: graphs/")
        print()
        print("✅ Career assessment reports are ready!")
    else:
        print(f"{Colors.YELLOW}⚠️ Pipeline incomplete - please check errors above{Colors.END}")
    
    print()
    print(f"Ended: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

if __name__ == "__main__":
    main()

