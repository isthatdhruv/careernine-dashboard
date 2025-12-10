# Career Assessment Report Generation Pipeline

A comprehensive 6-phase pipeline for generating personalized career assessment reports for students based on their psychometric test results.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** Required only for Phase 4 (AI Summaries). You can skip this if not using AI summaries.

### 3. Prepare Your Data

Place your Excel file with student data in the project directory, then normalize it:

```bash
python3 00_data_normalizer.py your_data.xlsx --output input.xlsx
```

### 4. Run the Pipeline

**Option A: Interactive Menu (Easiest)**
```bash
python3 pipeline_menu.py
```

**Option B: Complete Pipeline**
```bash
python3 master_pipeline.py
```

**Option C: Individual Phases**
```bash
python3 01_core_analysis.py      # Phase 1
python3 02_career_pathway_analysis.py  # Phase 2
# ... and so on
```

## 📋 Pipeline Overview

The pipeline consists of 6 phases that transform raw student assessment data into personalized career reports:

### Phase 0: Data Normalization (Optional)

**Purpose:** Normalize different Excel formats to a standard format

**Command:**
```bash
python3 00_data_normalizer.py <input_file.xlsx> --output input.xlsx
```

**What it does:**
- Standardizes column names (handles variations like "SOI 1" vs "Subject Of Interest 1")
- Maps RIASEC codes to full personality names
- Validates required columns
- Creates `input.xlsx` with standardized format

**Output:** `input.xlsx` with `suitability_index` sheet

---

### Phase 1: Core Analysis

**Purpose:** Calculate top personalities, intelligences, abilities, and career pathway suitability scores

**Command:**
```bash
python3 01_core_analysis.py
```

**What it does:**
- Calculates personality stanine scores and identifies top 3 traits
- Identifies top 3 intelligence types
- Maps learning styles and preferences
- Ranks top 5 abilities
- Calculates career pathway suitability (top 9 pathways)
- Identifies weak abilities

**Output:** `input.xlsx` with additional sheets:
- `top_personality` - Top 3 personality traits per student
- `top_intelligence` - Top 3 intelligence types per student
- `preferences` - Learning styles and preferences
- `ability` - Top 5 abilities per student
- `suitability_index` - Updated with all analysis

---

### Phase 2: Career Pathway Analysis

**Purpose:** Analyze career pathways and identify what students have/lack for each pathway

**Command:**
```bash
python3 02_career_pathway_analysis.py
```

**What it does:**
- Analyzes top 3 career pathways for each student
- Identifies personality traits, intelligences, abilities, SOIs, and values that match each pathway
- Identifies what students lack for each pathway
- Generates "Has" and "Lacks" data for pathway descriptions

**Output:** `input.xlsx` updated with pathway analysis columns (CP1, CP2, CP3 Has/Lacks)

---

### Phase 3: Career Matching

**Purpose:** Match student career aspirations with suitable career pathways

**Command:**
```bash
python3 03_career_matching.py
```

**Note:** Automatically skipped for classes 6-8 (they don't have career aspirations)

**What it does:**
- Compares student career aspirations with suitability-ranked pathways
- Identifies matches and mismatches
- Provides career matching insights

**Output:** `input.xlsx` updated with career matching results

---

### Phase 4: AI Summaries

**Purpose:** Generate personalized AI summaries for each student

**Command:**
```bash
python3 04_ai_summaries.py              # Normal run
python3 04_ai_summaries.py --resume     # Resume if interrupted
python3 04_ai_summaries.py --force      # Regenerate all summaries
```

**Requirements:** OpenAI API key in `.env` file

**What it does:**
- Generates personalized AI summary for each student
- Creates learning style summary
- Saves progress in `ai_progress.csv` (can resume if interrupted)

**⚠️ Cost Warning:** This phase uses OpenAI API and incurs costs

**Output:** `input.xlsx` updated with `AI_Summary` and `Learning_Style_Summary` columns

---

### Phase 5: Data Enrichment

**Purpose:** Enrich data with all required fields for report generation

**Command:**
```bash
python3 05_data_enrichment.py
```

**What it does:**
- Combines all analysis data into a single `Master_Sheet`
- Adds pathway descriptions and recommendations
- Validates data completeness
- Prepares final data structure for report generation

**Output:** `input.xlsx` with `Master_Sheet` containing all enriched data

---

### Phase 6: Report Generation

**Purpose:** Generate individual Word reports for each student

**Command:**
```bash
python3 06_generate_reports.py
```

**What it does:**
- Generates personalized DOCX reports for each student
- Organizes reports by School/Class/Section
- Uses appropriate template based on class (6-8, 9-10, 11-12)
- Includes graphs, images, and all analysis data

**Output:** `Reports/english/[School]/[Class]/[Section]/*.docx`

---

## 🛠️ Utility Commands

### Process New Data (Interactive)
```bash
python3 process_new_data.py
```
Interactive script to detect and process new Excel files.

### Regenerate Reports
```bash
python3 regenerate_reports.py
```
Remove students from tracker and regenerate their reports.

### Convert Reports to PDF
```bash
# Convert all reports
python3 batch_docx_to_pdf.py --all --yes

# Convert specific folder
python3 batch_docx_to_pdf.py --folder "Reports/english/SchoolName/Class9/SectionA"
```

### Check Eligibility (Optional)
```bash
python3 00_eligibility_check.py input.xlsx
```
Check which students are eligible for report generation based on data quality.

### Validate Pathway Data (Optional)
```bash
python3 00_validate_pathway_data.py
```
Validate pathway data after Phase 2 or Phase 5.

---

## 📁 Project Structure

```
career-9-report-logic/
├── README.md                    # This file
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables (create this)
│
├── master_pipeline.py           # Main orchestrator (run this!)
├── pipeline_menu.py             # Interactive menu
│
├── 00_data_normalizer.py        # Phase 0: Data normalization
├── 00_eligibility_check.py       # Eligibility validation
├── 00_validate_pathway_data.py  # Pathway validation
├── 01_core_analysis.py          # Phase 1: Core analysis
├── 02_career_pathway_analysis.py # Phase 2: Career pathways
├── 03_career_matching.py        # Phase 3: Career matching
├── 04_ai_summaries.py           # Phase 4: AI summaries
├── 05_data_enrichment.py        # Phase 5: Data enrichment
├── 06_generate_reports.py       # Phase 6: Report generation
│
├── backup_utils.py              # Backup utilities
├── student_tracker.py            # Student tracking system
├── report_path_utils.py          # Report path utilities
├── process_new_data.py           # New data processor
├── regenerate_reports.py         # Report regeneration
├── batch_docx_to_pdf.py         # PDF conversion
│
├── data/                         # Reference data (JSON files)
├── Templates/                    # Report templates (DOCX)
├── images/                       # Personality/Intelligence images
├── final_report_scripts/         # Report generation scripts
│
├── input.xlsx                    # Your data file (not in repo)
├── Reports/                      # Generated reports (not in repo)
└── graphs/                       # Generated graphs (not in repo)
```

---

## 📊 Input Data Format

Your Excel file should have a sheet with student data. Required columns:

### Required Columns:
- `Name` - Student's full name
- `Class` - Class number (6, 7, 8, 9, 10, 11, or 12)
- `School` - School name
- `Section` - Section name (optional but recommended)

### Assessment Data:
- **Personality:** `Realistic`, `Investigative`, `Artistic`, `Social`, `Enterprising`, `Conventional`
- **Intelligence:** `Linguistic`, `Logical-Mathematical`, `Spatial`, `Bodily-Kinesthetic`, `Musical`, `Interpersonal`, `Intrapersonal`, `Naturalistic`
- **Abilities:** Various ability scores
- **Subject of Interest:** `Subject Of Interest 1` through `5` (or `SOI 1` through `5`)
- **Career Aspirations:** `Career Aspiration 1` through `4` (for classes 9-12)
- **Values:** `Value 1` through `5`

**Note:** The system automatically handles column name variations (e.g., `SOI 1` vs `Subject Of Interest 1`).

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Student Tracking

The system uses `student_reports_tracker.xlsx` to track processed students:
- **To reprocess a student:** Remove their entry from the tracker
- **To process new only:** Just add new students to `input.xlsx` - system auto-detects

---

## 📝 Common Workflows

### Workflow 1: Process New Data File

```bash
# Step 1: Normalize
python3 00_data_normalizer.py dalimss_data.xlsx --output input.xlsx

# Step 2: Run complete pipeline
python3 master_pipeline.py
```

### Workflow 2: Run Only Phase 1

```bash
# Step 1: Normalize
python3 00_data_normalizer.py dalimss_data.xlsx --output input.xlsx

# Step 2: Run Phase 1 only
python3 01_core_analysis.py
```

### Workflow 3: Regenerate Reports for Specific Students

```bash
# Step 1: Remove students from tracker
python3 regenerate_reports.py

# Step 2: Run pipeline again
python3 master_pipeline.py
```

---

## ⚠️ Important Notes

1. **Data Format:** Input Excel must have student data (sheet name doesn't matter - normalizer handles it)
2. **API Costs:** Phase 4 uses OpenAI API and incurs costs
3. **Backups:** System automatically creates backups before processing
4. **Class 6-8:** Phase 3 (Career Matching) is automatically skipped
5. **Resume Support:** Phase 4 can be resumed if interrupted (progress saved in `ai_progress.csv`)

---

## 🐛 Troubleshooting

### Missing OPENAI_API_KEY
**Solution:** Create `.env` file with `OPENAI_API_KEY=your_key_here`

### Phase 5 Failed
**Solution:** Check data quality - ensure all required columns are present

### Worksheet 'suitability_index' not found
**Solution:** Run Phase 0 (data normalizer) first - it creates the `suitability_index` sheet

### Reports not generating
**Solution:** 
1. Check `student_reports_tracker.xlsx` - students may already be processed
2. Use `regenerate_reports.py` to remove entries
3. Check data quality in master sheet

---

## 📞 Support

- Check error messages - they usually indicate what's wrong
- Review validation reports (`.json` files generated during processing)
- Check backup logs to see what was processed

---

**Last Updated:** November 2024
