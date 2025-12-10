#!/usr/bin/env python3
"""
Regenerate Reports for Existing Students
Allows reprocessing students who already have reports
"""

import pandas as pd
import sys
import os
from student_tracker import load_tracker, save_tracker, get_student_id

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def list_tracked_students():
    """List all students in the tracker"""
    tracker_df = load_tracker()
    
    if tracker_df.empty:
        print(f"{Colors.YELLOW}No students in tracker{Colors.END}")
        return
    
    print(f"\n{Colors.BOLD}📊 TRACKED STUDENTS ({len(tracker_df)} total){Colors.END}")
    print("=" * 70)
    
    for idx, row in tracker_df.iterrows():
        class_val = str(row['Class']) if pd.notna(row['Class']) else 'Unknown'
        print(f"{idx+1:3d}. {row['Name']:30s} | Class {class_val:5s} | "
              f"Group: {row.get('Class_Group', 'Unknown'):6s} | "
              f"Date: {row.get('Generated_Date', 'Unknown')}")
    
    print()

def remove_students_from_tracker(student_names, by_name=True):
    """
    Remove students from tracker by name or Student_ID
    Returns: number of students removed
    """
    tracker_df = load_tracker()
    
    if tracker_df.empty:
        print(f"{Colors.YELLOW}Tracker is empty{Colors.END}")
        return 0
    
    initial_count = len(tracker_df)
    
    if by_name:
        # Remove by name (case-insensitive)
        names_lower = [name.strip().lower() for name in student_names]
        tracker_df = tracker_df[~tracker_df['Name'].str.lower().isin(names_lower)]
    else:
        # Remove by Student_ID
        tracker_df = tracker_df[~tracker_df['Student_ID'].isin(student_names)]
    
    removed_count = initial_count - len(tracker_df)
    
    if removed_count > 0:
        save_tracker(tracker_df)
        print(f"{Colors.GREEN}✅ Removed {removed_count} student(s) from tracker{Colors.END}")
        print(f"   Remaining: {len(tracker_df)} students")
    else:
        print(f"{Colors.YELLOW}⚠️  No matching students found to remove{Colors.END}")
    
    return removed_count

def remove_all_students_from_tracker():
    """Remove all students from tracker (use with caution!)"""
    response = input(f"{Colors.RED}⚠️  Are you sure you want to remove ALL students from tracker? (yes/no): {Colors.END}")
    if response.lower() != 'yes':
        print("Cancelled.")
        return False
    
    # Create empty tracker
    tracker_df = pd.DataFrame(columns=[
        'Name', 'Class', 'Student_ID', 'Report_Generated', 
        'Generated_Date', 'Report_Path', 'Class_Group'
    ])
    save_tracker(tracker_df)
    print(f"{Colors.GREEN}✅ All students removed from tracker{Colors.END}")
    return True

def regenerate_students(student_names):
    """
    Remove students from tracker so they can be regenerated
    Then run the pipeline
    """
    print(f"\n{Colors.BOLD}🔄 REGENERATING REPORTS{Colors.END}")
    print("=" * 70)
    
    # Remove from tracker
    removed = remove_students_from_tracker(student_names)
    
    if removed == 0:
        print(f"{Colors.RED}❌ No students removed. Cannot regenerate.{Colors.END}")
        return False
    
    print(f"\n{Colors.BLUE}📋 Next steps:{Colors.END}")
    print("1. Ensure your input.xlsx contains the students you want to regenerate")
    print("2. Run: python3 master_pipeline.py")
    print("3. The pipeline will process these students as new students")
    
    return True

def interactive_mode():
    """Interactive mode for selecting students to regenerate"""
    tracker_df = load_tracker()
    
    if tracker_df.empty:
        print(f"{Colors.YELLOW}No students in tracker{Colors.END}")
        return
    
    print(f"\n{Colors.BOLD}📊 Select students to regenerate:{Colors.END}")
    print("=" * 70)
    
    for idx, row in tracker_df.iterrows():
        class_val = str(row['Class']) if pd.notna(row['Class']) else 'Unknown'
        print(f"{idx+1:3d}. {row['Name']:30s} | Class {class_val:5s} | "
              f"Group: {row.get('Class_Group', 'Unknown')}")
    
    print()
    print("Enter student numbers (comma-separated) or 'all' for all students:")
    print("Example: 1,3,5 or all")
    
    selection = input("Selection: ").strip()
    
    if selection.lower() == 'all':
        remove_all_students_from_tracker()
        return
    
    try:
        indices = [int(x.strip()) - 1 for x in selection.split(',')]
        selected_students = tracker_df.iloc[indices]
        student_names = selected_students['Name'].tolist()
        
        print(f"\n{Colors.BLUE}Selected students:{Colors.END}")
        for name in student_names:
            print(f"  • {name}")
        
        confirm = input(f"\n{Colors.YELLOW}Remove these {len(student_names)} students from tracker? (yes/no): {Colors.END}")
        if confirm.lower() == 'yes':
            remove_students_from_tracker(student_names)
            print(f"\n{Colors.GREEN}✅ Students removed. Run 'python3 master_pipeline.py' to regenerate.{Colors.END}")
        else:
            print("Cancelled.")
    except (ValueError, IndexError) as e:
        print(f"{Colors.RED}❌ Invalid selection: {e}{Colors.END}")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print(f"{Colors.BOLD}REGENERATE REPORTS UTILITY{Colors.END}")
        print("=" * 70)
        print()
        print("Usage:")
        print("  python3 regenerate_reports.py list                    - List all tracked students")
        print("  python3 regenerate_reports.py remove <name1> [name2]  - Remove specific students")
        print("  python3 regenerate_reports.py remove-all             - Remove all students (careful!)")
        print("  python3 regenerate_reports.py interactive             - Interactive selection")
        print()
        print("Examples:")
        print("  python3 regenerate_reports.py list")
        print("  python3 regenerate_reports.py remove 'Veer Singh' 'John Doe'")
        print("  python3 regenerate_reports.py interactive")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'list':
        list_tracked_students()
    
    elif command == 'remove':
        if len(sys.argv) < 3:
            print(f"{Colors.RED}❌ Please provide student names{Colors.END}")
            print("Example: python3 regenerate_reports.py remove 'Veer Singh' 'John Doe'")
            return
        
        student_names = sys.argv[2:]
        remove_students_from_tracker(student_names)
        print(f"\n{Colors.GREEN}✅ Next: Run 'python3 master_pipeline.py' to regenerate reports{Colors.END}")
    
    elif command == 'remove-all':
        remove_all_students_from_tracker()
        if tracker_df.empty:
            print(f"\n{Colors.GREEN}✅ Next: Run 'python3 master_pipeline.py' to regenerate all reports{Colors.END}")
    
    elif command == 'interactive':
        interactive_mode()
    
    else:
        print(f"{Colors.RED}❌ Unknown command: {command}{Colors.END}")

if __name__ == "__main__":
    main()

