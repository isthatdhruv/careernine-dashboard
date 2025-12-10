#!/usr/bin/env python3
"""
Backup Utilities for Master Data
Handles backing up input.xlsx and Master_Sheet with duplicate detection
"""

import pandas as pd
import os
import shutil
from datetime import datetime
from pathlib import Path
import hashlib

BACKUP_DIR = "backups/master_data"
BACKUP_LOG = "backups/backup_log.csv"

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def ensure_backup_dir():
    """Create backup directory if it doesn't exist"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    return BACKUP_DIR

def get_student_hash(df):
    """Generate a hash from student names to detect duplicates"""
    if df.empty:
        return None
    
    # Create a sorted list of student names (case-insensitive)
    names = sorted([str(name).strip().lower() for name in df['Name'].tolist() if pd.notna(name)])
    names_str = '|'.join(names)
    
    # Generate hash
    return hashlib.md5(names_str.encode()).hexdigest()[:12]

def check_duplicate_backup(student_hash, sheet_name='suitability_index'):
    """Check if a backup with the same students already exists"""
    if not os.path.exists(BACKUP_LOG):
        return None
    
    try:
        log_df = pd.read_csv(BACKUP_LOG)
        # Check if hash exists and sheet matches
        matches = log_df[(log_df['student_hash'] == student_hash) & 
                         (log_df['sheet_name'] == sheet_name)]
        if not matches.empty:
            return matches.iloc[0]['backup_file']
    except:
        pass
    
    return None

def backup_input_file(description="before processing"):
    """
    Backup input.xlsx before it gets overwritten
    Always creates a backup (no duplicate detection to avoid missing data)
    Returns: backup file path
    """
    if not os.path.exists('input.xlsx'):
        print(f"{Colors.YELLOW}⚠️  input.xlsx not found, skipping backup{Colors.END}")
        return None
    
    ensure_backup_dir()
    
    try:
        # Load data
        df = pd.read_excel('input.xlsx', sheet_name='suitability_index')
        student_hash = get_student_hash(df)
        
        # Always create backup with timestamp (no duplicate check)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        student_count = len(df)
        backup_name = f"input_backup_{timestamp}_{student_count}students.xlsx"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        
        # Copy file
        shutil.copy2('input.xlsx', backup_path)
        
        # Log backup
        log_entry = {
            'timestamp': timestamp,
            'backup_file': backup_name,
            'description': description,
            'student_count': student_count,
            'student_hash': student_hash,
            'sheet_name': 'suitability_index',
            'file_size_kb': os.path.getsize(backup_path) / 1024
        }
        
        # Append to log
        if os.path.exists(BACKUP_LOG):
            log_df = pd.read_csv(BACKUP_LOG)
            log_df = pd.concat([log_df, pd.DataFrame([log_entry])], ignore_index=True)
        else:
            log_df = pd.DataFrame([log_entry])
        
        log_df.to_csv(BACKUP_LOG, index=False)
        
        print(f"{Colors.GREEN}✅ Backed up input.xlsx{Colors.END}")
        print(f"   File: {backup_name}")
        print(f"   Students: {student_count}")
        print(f"   Size: {log_entry['file_size_kb']:.1f} KB")
        
        return backup_path
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error backing up input.xlsx: {e}{Colors.END}")
        return None

def backup_master_sheet(description="after processing"):
    """
    Backup Master_Sheet after Phase 5 completes
    Always creates a backup (no duplicate detection to avoid missing data)
    Returns: backup file path
    """
    if not os.path.exists('input.xlsx'):
        print(f"{Colors.YELLOW}⚠️  input.xlsx not found, skipping Master_Sheet backup{Colors.END}")
        return None
    
    ensure_backup_dir()
    
    try:
        # Check if Master_Sheet exists
        xl_file = pd.ExcelFile('input.xlsx')
        if 'Master_Sheet' not in xl_file.sheet_names:
            print(f"{Colors.YELLOW}⚠️  Master_Sheet not found in input.xlsx{Colors.END}")
            return None
        
        # Load Master_Sheet
        df = pd.read_excel('input.xlsx', sheet_name='Master_Sheet')
        student_hash = get_student_hash(df)
        
        # Always create backup with timestamp (no duplicate check)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        student_count = len(df)
        backup_name = f"master_sheet_backup_{timestamp}_{student_count}students.xlsx"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        
        # Create backup with only Master_Sheet
        with pd.ExcelWriter(backup_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Master_Sheet', index=False)
        
        # Log backup
        log_entry = {
            'timestamp': timestamp,
            'backup_file': backup_name,
            'description': description,
            'student_count': student_count,
            'student_hash': student_hash,
            'sheet_name': 'Master_Sheet',
            'file_size_kb': os.path.getsize(backup_path) / 1024
        }
        
        # Append to log
        if os.path.exists(BACKUP_LOG):
            log_df = pd.read_csv(BACKUP_LOG)
            log_df = pd.concat([log_df, pd.DataFrame([log_entry])], ignore_index=True)
        else:
            log_df = pd.DataFrame([log_entry])
        
        log_df.to_csv(BACKUP_LOG, index=False)
        
        print(f"{Colors.GREEN}✅ Backed up Master_Sheet{Colors.END}")
        print(f"   File: {backup_name}")
        print(f"   Students: {student_count}")
        print(f"   Size: {log_entry['file_size_kb']:.1f} KB")
        
        return backup_path
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error backing up Master_Sheet: {e}{Colors.END}")
        return None

def list_backups(backup_type='all'):
    """List all backups with details"""
    if not os.path.exists(BACKUP_LOG):
        print(f"{Colors.YELLOW}No backups found{Colors.END}")
        return
    
    log_df = pd.read_csv(BACKUP_LOG)
    
    if backup_type == 'input':
        log_df = log_df[log_df['sheet_name'] == 'suitability_index']
    elif backup_type == 'master':
        log_df = log_df[log_df['sheet_name'] == 'Master_Sheet']
    
    if log_df.empty:
        print(f"{Colors.YELLOW}No {backup_type} backups found{Colors.END}")
        return
    
    print(f"\n{Colors.BOLD}📦 BACKUPS ({len(log_df)} found){Colors.END}")
    print("=" * 70)
    
    for _, row in log_df.iterrows():
        exists = os.path.exists(os.path.join(BACKUP_DIR, row['backup_file']))
        status = "✅" if exists else "❌ MISSING"
        print(f"{status} {row['backup_file']}")
        print(f"   Date: {row['timestamp']} | Students: {row['student_count']} | "
              f"Size: {row['file_size_kb']:.1f} KB | {row['description']}")
        print()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'list':
            backup_type = sys.argv[2] if len(sys.argv) > 2 else 'all'
            list_backups(backup_type)
        elif sys.argv[1] == 'backup-input':
            backup_input_file()
        elif sys.argv[1] == 'backup-master':
            backup_master_sheet()
    else:
        print("Usage:")
        print("  python3 backup_utils.py backup-input   - Backup input.xlsx")
        print("  python3 backup_utils.py backup-master  - Backup Master_Sheet")
        print("  python3 backup_utils.py list [all|input|master] - List backups")

