#!/usr/bin/env python3
"""
Student Report Tracking System
Tracks which students have already had reports generated to avoid reprocessing
"""

import pandas as pd
import os
from datetime import datetime
from report_path_utils import get_report_path, build_report_filename

TRACKER_FILE = "student_reports_tracker.xlsx"

def load_tracker():
    """Load the student tracker, create if doesn't exist"""
    if os.path.exists(TRACKER_FILE):
        try:
            df = pd.read_excel(TRACKER_FILE)
            print(f"  ✅ Loaded tracker with {len(df)} students")
            for col in ['UID', 'Roll_Number', 'School', 'Report_Generated',
                        'Generated_Date', 'Report_Path', 'Class_Group']:
                if col not in df.columns:
                    df[col] = ''
            if 'Student_ID' not in df.columns:
                df['Student_ID'] = df.apply(get_student_id, axis=1)
            return df
        except Exception as e:
            print(f"  ⚠️  Error loading tracker: {e}, creating new one")
            return create_new_tracker()
    else:
        print(f"  📝 Creating new tracker file: {TRACKER_FILE}")
        # Scan existing reports to build initial tracker
        return scan_existing_reports()

def create_new_tracker():
    """Create a new empty tracker"""
    df = pd.DataFrame(columns=[
        'Name', 'Class', 'Student_ID', 'UID', 'Roll_Number', 'School',
        'Report_Generated', 
        'Generated_Date', 'Report_Path', 'Class_Group'
    ])
    return df

def scan_existing_reports():
    """Scan existing reports to build initial tracker"""
    print(f"  🔍 Scanning existing reports...")
    
    tracker_entries = []
    
    # Scan English reports
    english_dir = "Reports/english/"
    if os.path.exists(english_dir):
        for root, _, files in os.walk(english_dir):
            for filename in files:
                if not filename.endswith('.docx') or filename.startswith('~$'):
                    continue
                try:
                    rel_path = os.path.relpath(os.path.join(root, filename), english_dir)
                    parts = rel_path.split(os.sep)
                    school = parts[0] if len(parts) > 0 else ''
                    class_part = parts[1] if len(parts) > 1 else ''
                    section_part = parts[2] if len(parts) > 2 else ''

                    class_val = ''
                    if class_part.lower().startswith('class'):
                        class_val = class_part[5:]
                    elif class_part:
                        class_val = class_part

                    section_val = ''
                    if section_part.lower().startswith('section'):
                        section_val = section_part[7:]
                    elif section_part:
                        section_val = section_part

                    name_part = filename.replace('.docx', '')
                    if '_Career-9_' not in name_part:
                        continue
                    name_token = name_part.split('_Career-9_')[0]

                    roll_number = ''
                    if '_Roll' in name_token:
                        name_segment, roll_segment = name_token.split('_Roll', 1)
                        name_token = name_segment
                        roll_number = roll_segment.split('_')[0]

                    name = name_token.replace('_', ' ').strip().title()

                    row_info = {
                        'Name': name,
                        'Class': class_val,
                        'School': school,
                        'Section': section_val,
                        'Roll Number': roll_number,
                        'UID': ''
                    }

                    student_id = get_student_id(row_info)

                    entry = {
                        'Name': name,
                        'Class': class_val,
                        'Student_ID': student_id,
                        'UID': '',
                        'Roll_Number': roll_number,
                        'School': school,
                        'Report_Generated': 'Yes',
                        'Generated_Date': 'Unknown',
                        'Report_Path': os.path.join(english_dir, rel_path),
                        'Class_Group': 'Unknown'
                    }
                    tracker_entries.append(entry)
                    print(f"    • Found: {name} ({rel_path})")

                except Exception as e:
                    print(f"    ⚠️  Could not parse filename: {filename} ({e})")
    
    if tracker_entries:
        df = pd.DataFrame(tracker_entries)
        print(f"  ✅ Found {len(tracker_entries)} existing reports")
        return df
    else:
        print(f"  📝 No existing reports found, creating empty tracker")
        return create_new_tracker()

def save_tracker(df):
    """Save the tracker to Excel file"""
    try:
        df.to_excel(TRACKER_FILE, index=False)
        print(f"  ✅ Tracker saved with {len(df)} students")
    except Exception as e:
        print(f"  ❌ Error saving tracker: {e}")

def get_student_id(row):
    """Generate a unique student ID using UID, roll number, school and class."""
    uid = str(row.get('UID', '')).strip()
    if uid:
        return uid.lower()

    tokens = []
    def add_token(value):
        if value is None:
            return
        value = str(value).strip().lower()
        if value:
            tokens.append(value)

    add_token(row.get('Name'))
    add_token(row.get('School'))
    add_token(row.get('Class'))
    add_token(row.get('Section'))
    add_token(row.get('Roll Number') or row.get('Roll_Number'))

    if not tokens:
        return ""

    return "|".join(tokens)

def filter_new_students(input_df, tracker_df):
    """Filter out students who already have reports generated"""
    if tracker_df.empty:
        print(f"  📝 No existing reports found, processing all {len(input_df)} students")
        return input_df, pd.DataFrame()
    
    # Get list of already processed student IDs
    processed_ids = set(tracker_df['Student_ID'].astype(str).str.lower().tolist())
    
    # Filter input data
    new_students = []
    existing_students = []
    
    for idx, row in input_df.iterrows():
        student_id = get_student_id(row).lower()
        if student_id in processed_ids:
            existing_students.append(row)
        else:
            new_students.append(row)
    
    # Convert to DataFrames
    new_df = pd.DataFrame(new_students) if new_students else pd.DataFrame()
    existing_df = pd.DataFrame(existing_students) if existing_students else pd.DataFrame()
    
    print(f"  📊 Found {len(new_students)} new students, {len(existing_students)} already processed")
    
    if existing_students:
        print(f"  ⏭️  Skipping already processed students:")
        for _, row in existing_df.iterrows():
            print(f"    • {row['Name']} (Class {row.get('Class', 'Unknown')})")
    
    return new_df, existing_df

def update_tracker_with_new_reports(tracker_df, new_students_df, class_group, report_dir="Reports/english"):
    """Update tracker with newly generated reports"""
    if new_students_df.empty:
        return tracker_df
    
    new_entries = []
    current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    template_suffix_map = {
        "6-8": "Career-9_Insight Navigator",
        "9-10": "Career-9_Stream Navigator",
        "11-12": "Career-9_Career Navigator"
    }
    template_suffix = template_suffix_map.get(class_group, "Career-9_Report")

    for idx, row in new_students_df.iterrows():
        student_id = get_student_id(row)
        name = row.get('Name', 'Unknown')
        class_val = row.get('Class', 'Unknown')
        school_val = row.get('School', 'Unknown')
        roll_number = row.get('Roll Number') or row.get('Roll_Number') or ''
        uid = row.get('UID', '')
        section_val = row.get('Section', '')

        report_directory = get_report_path(school_val, class_val, section_val, base_dir=report_dir)
        filename = build_report_filename(name, suffix=template_suffix, roll_number=roll_number, uid=uid, extension=".docx")
        report_path = os.path.join(report_directory, filename)
        abs_report_path = os.path.abspath(report_path)
        relative_report_path = os.path.relpath(abs_report_path, start=os.getcwd())
        
        new_entry = {
            'Name': name,
            'Class': class_val,
            'Student_ID': student_id,
            'UID': uid,
            'Roll_Number': roll_number,
            'School': school_val,
            'Report_Generated': 'Yes',
            'Generated_Date': current_date,
            'Report_Path': relative_report_path,
            'Class_Group': class_group
        }
        new_entries.append(new_entry)
    
    # Add new entries to tracker
    new_entries_df = pd.DataFrame(new_entries)
    updated_tracker = pd.concat([tracker_df, new_entries_df], ignore_index=True)
    
    print(f"  ✅ Added {len(new_entries)} new students to tracker")
    return updated_tracker

def get_class_group(class_val):
    """Determine class group based on class value"""
    try:
        class_num = int(str(class_val).replace('th', '').replace('st', '').replace('nd', '').replace('rd', ''))
        if class_num in [6, 7, 8]:
            return "6-8"
        elif class_num in [9, 10]:
            return "9-10"
        elif class_num in [11, 12]:
            return "11-12"
        else:
            return "Unknown"
    except:
        return "Unknown"

def main():
    """Main function to demonstrate usage"""
    print("=" * 60)
    print("STUDENT REPORT TRACKER")
    print("=" * 60)
    
    # Load tracker
    tracker_df = load_tracker()
    
    # Example: Load input data
    try:
        input_df = pd.read_excel('input.xlsx', sheet_name='suitability_index')
        print(f"📊 Input data: {len(input_df)} students")
        
        # Filter new students
        new_students_df, existing_students_df = filter_new_students(input_df, tracker_df)
        
        if not new_students_df.empty:
            print(f"\n🆕 New students to process: {len(new_students_df)}")
            for _, row in new_students_df.iterrows():
                class_group = get_class_group(row.get('Class'))
                print(f"  • {row['Name']} (Class {row.get('Class')} → {class_group})")
        
        if not existing_students_df.empty:
            print(f"\n⏭️  Skipping existing students: {len(existing_students_df)}")
            for _, row in existing_students_df.iterrows():
                print(f"  • {row['Name']} (Class {row.get('Class')})")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
