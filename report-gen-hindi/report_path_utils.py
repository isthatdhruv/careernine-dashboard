"""
REPORT PATH UTILITIES
=====================
Handles organizing reports by School > Class > Section structure
and PDF conversion.
"""

import os
import re
import pandas as pd
from typing import Optional

def clean_dir_name(name: str) -> str:
    """Clean directory name by removing special characters and spaces."""
    if pd.isna(name) or name == '':
        return 'NoSection'
    
    # Convert to string and strip
    name = str(name).strip()
    
    # Replace spaces and special characters with underscores
    name = re.sub(r'[^\w\s-]', '', name)  # Remove special chars
    name = re.sub(r'[\s_-]+', '_', name)  # Replace spaces/underscores with single underscore
    
    return name

def get_report_path(school: Optional[str], class_val: Optional[str], section: Optional[str], 
                     base_dir: str = "Reports/english") -> str:
    """
    Generate report path based on School > Class > Section structure.
    
    Args:
        school: School name (optional)
        class_val: Class value (optional)
        section: Section name (optional)
        base_dir: Base directory for reports
    
    Returns:
        Full path for report directory
    """
    import pandas as pd
    
    path_parts = [base_dir]
    
    # Add School if available
    if school and pd.notna(school) and str(school).strip():
        path_parts.append(clean_dir_name(school))
    
    # Add Class if available
    if class_val and pd.notna(class_val) and str(class_val).strip():
        class_name = f"Class{clean_dir_name(class_val)}"
        path_parts.append(class_name)
    
    # Add Section if available
    if section and pd.notna(section) and str(section).strip():
        section_name = f"Section{clean_dir_name(section)}"
        path_parts.append(section_name)
    
    # Join and create directory
    full_path = os.path.join(*path_parts)
    os.makedirs(full_path, exist_ok=True)
    
    return full_path

def sanitize_filename_token(value: Optional[str]) -> str:
    """Sanitize a value so it can be used safely in filenames."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    value = str(value).strip()
    if not value:
        return ""
    value = re.sub(r'[^\w\s-]', '', value)
    value = re.sub(r'\s+', '_', value)
    return value

def build_report_filename(name: str,
                          suffix: str,
                          roll_number: Optional[str] = None,
                          uid: Optional[str] = None,
                          extension: str = ".docx") -> str:
    """
    Build a unique report filename using student name and identifiers.

    Args:
        name: Student name
        suffix: Report suffix, e.g. "Career-9_Stream Navigator"
        roll_number: Student roll number if available
        uid: Student UID if available
        extension: File extension (default .docx)

    Returns:
        Sanitized filename string
    """
    name_token = sanitize_filename_token(name)
    if not name_token:
        name_token = "Student"

    roll_token = sanitize_filename_token(roll_number)
    uid_token = sanitize_filename_token(uid)

    tokens = [name_token]
    suffix_token = suffix.replace(" ", "_")
    filename = "_".join(tokens + [suffix_token])

    if not extension.startswith("."):
        extension = f".{extension}"

    return f"{filename}{extension}"

def convert_docx_to_pdf(docx_path: str, pdf_path: Optional[str] = None) -> bool:
    """
    Convert DOCX file to PDF.
    
    Args:
        docx_path: Path to DOCX file
        pdf_path: Path for PDF output (if None, same as DOCX but .pdf)
    
    Returns:
        True if conversion successful, False otherwise
    """
    if pdf_path is None:
        pdf_path = docx_path.replace('.docx', '.pdf')
    
    try:
        # Try docx2pdf first (requires Word/LibreOffice)
        try:
            from docx2pdf import convert
            convert(docx_path, pdf_path)
            return True
        except ImportError:
            print("⚠️  docx2pdf not installed. Trying alternative method...")
            
            # Alternative: Try LibreOffice command line
            import subprocess
            result = subprocess.run(
                ['libreoffice', '--headless', '--convert-to', 'pdf', 
                 '--outdir', os.path.dirname(pdf_path), docx_path],
                capture_output=True,
                timeout=30
            )
            if result.returncode == 0:
                # LibreOffice creates PDF in same directory, rename if needed
                generated_pdf = docx_path.replace('.docx', '.pdf')
                if os.path.exists(generated_pdf) and generated_pdf != pdf_path:
                    os.rename(generated_pdf, pdf_path)
                return True
            else:
                print(f"⚠️  PDF conversion failed. LibreOffice not found or error occurred.")
                print(f"   You can manually convert: {docx_path}")
                return False
                
    except Exception as e:
        print(f"⚠️  PDF conversion error: {e}")
        print(f"   DOCX saved at: {docx_path}")
        return False

if __name__ == "__main__":
    # Test the functions
    import pandas as pd
    
    test_path = get_report_path("Test School", "9", "A")
    print(f"Test path: {test_path}")
    
    test_path2 = get_report_path("Sigra", 9, None)
    print(f"Test path 2 (no section): {test_path2}")

