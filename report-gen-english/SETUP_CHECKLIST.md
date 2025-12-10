# Setup Checklist for New Users

## ✅ What's Included in the Repository

- ✅ All pipeline scripts (00-06 phases)
- ✅ `requirements.txt` with all dependencies
- ✅ `README.md` with complete instructions
- ✅ `data/*.json` - All reference data files
- ✅ `Templates/*.docx` - All report templates
- ✅ `images/*.png` - All personality/intelligence images
- ✅ `final_report_scripts/*.py` - All report generation scripts
- ✅ Interactive menu (`pipeline_menu.py`)

## 📋 Steps for New User

### 1. Clone the Repository
```bash
git clone https://github.com/prasad-career-9/career-9-report-logic.git
cd career-9-report-logic
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Set Up Environment (Optional - only for Phase 4)
```bash
# Create .env file
echo "OPENAI_API_KEY=your_key_here" > .env
```

### 4. Prepare Your Data
```bash
# Normalize your Excel file
python3 00_data_normalizer.py your_data.xlsx --output input.xlsx
```

### 5. Run the Pipeline
```bash
# Option A: Interactive menu (easiest)
python3 pipeline_menu.py

# Option B: Complete pipeline
python3 master_pipeline.py
```

## ✅ Verification

After cloning, verify these files exist:
- [ ] `requirements.txt`
- [ ] `README.md`
- [ ] `data/` directory with JSON files
- [ ] `Templates/` directory with DOCX files
- [ ] `images/` directory with PNG files
- [ ] `final_report_scripts/` directory with Python files
- [ ] All phase scripts (00-06)

## ⚠️ What's NOT Included (By Design)

- ❌ `input.xlsx` - Users provide their own data
- ❌ `.env` - Users create their own (for API keys)
- ❌ `Reports/` - Generated during pipeline run
- ❌ `graphs/` - Generated during pipeline run
- ❌ `backups/` - Created automatically

## 🎯 Ready to Use!

Once you've completed steps 1-4, you're ready to generate reports!



