import logging
import pandas as pd
import os
import sys
import shutil
from jinja2 import Environment, FileSystemLoader
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from datetime import datetime

# Add parent directory to path to import utils if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from report_path_utils import get_report_path, build_report_filename

# -------------------------------
# Setup Logging Configuration
# -------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info("Starting the HTML report generation process.")

# -------------------------------
# -------------------------------
# Configuration
# -------------------------------
# Robust path setup
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR) # report-gen

# Robust path to templates
TEMPLATE_DIR = os.path.join(PROJECT_ROOT, "Templates", "HTML Templates")
TEMPLATE_FILE = "9-10.html"

# Robust path to input.xlsx
EXCEL_PATH = os.path.join(PROJECT_ROOT, "input.xlsx")

SHEET_NAME = "Master_Sheet"
OUTPUT_DIR = "../Reports/english"
GRAPH_PERSONALITY_DIR = "../graphs/class_9-10/personality"
GRAPH_INTELLIGENCE_DIR = "../graphs/class_9-10/intelligence"

# Create necessary directories
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(GRAPH_PERSONALITY_DIR, exist_ok=True)
os.makedirs(GRAPH_INTELLIGENCE_DIR, exist_ok=True)

# -------------------------------
# Asset Management
# -------------------------------
import json

# ... (imports remain the same)

# -------------------------------
# Asset Management
# -------------------------------
def setup_assets(target_dir):
    """Copies assets and images folders to the target directory if they don't exist."""
    source_assets = os.path.join(TEMPLATE_DIR, "assets")
    source_images = os.path.join(TEMPLATE_DIR, "images")
    
    target_assets = os.path.join(target_dir, "assets")
    target_images = os.path.join(target_dir, "images")
    
    # Optimize: Only copy if target doesn't exist
    if os.path.exists(source_assets) and not os.path.exists(target_assets):
        shutil.copytree(source_assets, target_assets)
        logging.info(f"Copied assets to {target_assets}")

    if os.path.exists(source_images) and not os.path.exists(target_images):
        shutil.copytree(source_images, target_images)
        logging.info(f"Copied images to {target_images}")

# Initial setup for default output dir
setup_assets(OUTPUT_DIR)

# -------------------------------
# Data Loading
# -------------------------------
try:
    data = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME).fillna("")
    logging.info(f"Excel data loaded successfully. Total records: {len(data)}")
except Exception as e:
    logging.error(f"Failed to read Excel file: {EXCEL_PATH}. Exception: {e}")
    raise

# -------------------------------
# Graph Generation Functions
# -------------------------------
def create_personality_graph(student_name, scores, categories):
    # Sanitize student name for filename
    safe_name = "".join(c for c in student_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
    graph_filename = f"personality_graph_{safe_name}.png"
    graph_path = os.path.join(GRAPH_PERSONALITY_DIR, graph_filename)
    
    # Force regeneration - do not check if exists
    
    fig, ax = plt.subplots(figsize=(6.9, 2))
    # ... (rest of graph generation logic)
    
    # Define gradient colors
    base_color = "#0096c7"  # Teal blue
    lighter_color = "#a8e6ff"  # Light cyan

    # Normalize values for gradient
    norm = mcolors.Normalize(vmin=min(scores), vmax=max(scores))
    cmap = mcolors.LinearSegmentedColormap.from_list("custom_blue", [lighter_color, base_color])

    # Create a mapping from old to new category names
    category_mapping = {
        "Realistic": "Doer",
        "Investigative": "Thinker",
        "Artistic": "Creator",
        "Social": "Helper",
        "Enterprising": "Persuader",
        "Conventional": "Organizer"
    }

    # Convert old category names to new labels
    new_categories = [category_mapping.get(cat, cat) for cat in categories]

    # Create bars with gradient effect
    bars = ax.bar(new_categories, scores, color=[cmap(norm(score)) for score in scores], width=0.6)

    # Add values on top of bars
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3, str(int(bar.get_height())),
                ha='center', va='bottom', fontsize=9, fontweight='bold', color='black')

    # Formatting
    ax.set_xticks(range(len(new_categories)))
    ax.set_xticklabels(new_categories, fontsize=8, fontweight='bold', rotation=0, color="black")

    # Remove unnecessary elements
    ax.set_yticks([])
    ax.set_frame_on(False)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.spines['bottom'].set_visible(False)
    
    plt.savefig(graph_path, bbox_inches='tight', transparent=True)
    plt.close()
    return graph_path

def create_intelligence_graph(student_name, scores, categories):
    # Sanitize student name for filename
    safe_name = "".join(c for c in student_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
    graph_filename = f"intelligence_graph_{safe_name}.png"
    graph_path = os.path.join(GRAPH_INTELLIGENCE_DIR, graph_filename)

    # Force regeneration - do not check if exists

    fig, ax = plt.subplots(figsize=(6.9, 2))
    # ... (rest of graph generation logic)

    # Define gradient colors for intelligence graph (different from personality)
    base_color = "#0096c7"  # Teal blue
    lighter_color = "#a8e6ff"  # Light cyan

    # Normalize values for gradient
    norm = mcolors.Normalize(vmin=min(scores), vmax=max(scores))
    cmap = mcolors.LinearSegmentedColormap.from_list("custom_orange", [lighter_color, base_color])

    # Create bars with gradient effect
    bars = ax.bar(categories, scores, color=[cmap(norm(score)) for score in scores], width=0.6)

    # Add values on top of bars
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3, str(int(bar.get_height())),
                ha='center', va='bottom', fontsize=9, fontweight='bold', color='black')

    # Formatting
    ax.set_xticks(range(len(categories)))
    ax.set_xticklabels(categories, fontsize=5, fontweight='bold', rotation=0, color="black")

    # Remove unnecessary elements
    ax.set_yticks([])
    ax.set_frame_on(False)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.spines['bottom'].set_visible(False)

    plt.savefig(graph_path, bbox_inches='tight', transparent=True)
    plt.close()
    return graph_path

def format_recommendations(text):
    """Formats recommendations for HTML display."""
    if not text: return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    formatted_lines = []
    for line in lines:
        if ":" in line:
            heading, desc = line.split(":", 1)
            formatted_lines.append(f"<strong>{heading.strip()}</strong>: {desc.strip()}")
        else:
            formatted_lines.append(line)
    return "<br>".join(formatted_lines)

# -------------------------------
# Processing Loop
# -------------------------------
# Processing Loop
# -------------------------------
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
template = env.get_template(TEMPLATE_FILE)

limit_env = os.getenv("REPORT_LIMIT")
REPORT_LIMIT = int(limit_env) if limit_env else None
processed_count = 0

generated_reports = []

for index, row in data.iterrows():
    student_name = row.get("Name", "Unknown")
    
    if row.get("Class") not in [9, 10]:
        continue

    try:
        ai_summary_val = str(row.get("AI_Summary", row.get("AI Summary", "")) or "").strip()
        ls_summary_val = str(row.get("Learning_Style_Summary", row.get("Learning Style Summary", "")) or "").strip()
        
        if not ai_summary_val or not ls_summary_val:
            logging.warning(f"Skipping {student_name}: missing AI summaries")
            continue
            
        logging.info(f"Processing record {index + 1}/{len(data)}: {student_name}")

        # Graph Data Preparation
        personality_categories = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"]
        base_intelligence_categories = [
            "Bodily-Kinesthetic", "Intrapersonal", "Interpersonal", "Linguistic",
            "Logical-Mathematical", "Musical", "Visual-Spatial"
        ]
        intelligence_categories = list(base_intelligence_categories)
        
        naturalistic_val = row.get("Naturalistic") or row.get("Naturalistic ") or 0
        try:
            naturalistic_score = float(naturalistic_val) if naturalistic_val not in (None, "") else 0.0
        except:
            naturalistic_score = 0.0
            
        if naturalistic_score > 0:
            intelligence_categories.append("Naturalistic")

        personality_scores = [float(row.get(f"Stanine_{cat}", 0) or 0) for cat in personality_categories]
        
        alias_map = {
            "Logical-Mathematical": ["Logical-Mathematical", "Logical", "Logical Reasoning", "Logical reasoning"],
            "Visual-Spatial": ["Visual-Spatial", "Spatial-Visual", "Visual Spatial", "Spatial Visual"],
            "Bodily-Kinesthetic": ["Bodily-Kinesthetic", "Bodily Kinesthetic"],
            "Intrapersonal": ["Intrapersonal"],
            "Interpersonal": ["Interpersonal"],
            "Linguistic": ["Linguistic", "Verbal-Linguistic", "Verbal Linguistic"],
            "Musical": ["Musical"],
            "Naturalistic": ["Naturalistic", "Naturalistic "]
        }

        def get_score(canonical_label):
            aliases = alias_map.get(canonical_label, [canonical_label])
            aliases_with_spaces = [a + " " for a in aliases]
            for key in aliases + aliases_with_spaces:
                val = row.get(key)
                if val not in (None, ""):
                    try: return float(val)
                    except: continue
            return 0.0

        intelligence_scores = [get_score(cat) for cat in intelligence_categories]

        # Generate Graphs
        p_graph_path = create_personality_graph(student_name, personality_scores, personality_categories)
        i_graph_path = create_intelligence_graph(student_name, intelligence_scores, intelligence_categories)

        # Determine Output Directory
        school = row.get("School", None)
        class_val = row.get("Class", None)
        section = row.get("Section", None)
        
        if school or class_val or section:
            report_dir = get_report_path(school, class_val, section, base_dir=OUTPUT_DIR)
            # Ensure assets exist in this specific report dir
            setup_assets(report_dir)
        else:
            report_dir = OUTPUT_DIR

        # Calculate relative paths for graphs
        # report_dir is absolute or relative to cwd. p_graph_path is relative to cwd.
        # We need p_graph_path relative to report_dir.
        rel_p_graph = os.path.relpath(p_graph_path, report_dir)
        rel_i_graph = os.path.relpath(i_graph_path, report_dir)

        # Context Preparation
        context = {
            "name_caps": str(row.get("Name_Caps", "")).upper(),
            "name": row.get("Name", ""),
            "f_name": row.get("First Name", ""),
            "class": row.get("Class", ""),
            "school": row.get("School", ""),
            "summary": ai_summary_val,
            
            "personality_graph": rel_p_graph,
            "intelligence_graph": rel_i_graph,
            
            "personality_1_text": row.get("Personality 1 Text", ""),
            "personality_2_text": row.get("Personality 2 Text", ""),
            "personality_3_text": row.get("Personality 3 Text", ""),
            
            "personality_1_image": f'<img src="images/{row.get("Personality 1 Image", "")}" style="width: 100px;">' if row.get("Personality 1 Image") else "",
            "personality_2_image": f'<img src="images/{row.get("Personality 2 Image", "")}" style="width: 100px;">' if row.get("Personality 2 Image") else "",
            "personality_3_image": f'<img src="images/{row.get("Personality 3 Image", "")}" style="width: 100px;">' if row.get("Personality 3 Image") else "",
            
            "intelligence_1_image": f'<img src="images/{row.get("Intelligence 1 Image", "")}" style="width: 100px;">' if row.get("Intelligence 1 Image") else "",
            "intelligence_2_image": f'<img src="images/{row.get("Intelligence 2 Image", "")}" style="width: 100px;">' if row.get("Intelligence 2 Image") else "",
            "intelligence_3_image": f'<img src="images/{row.get("Intelligence 3 Image", "")}" style="width: 100px;">' if row.get("Intelligence 3 Image") else "",

            "intelligence_1_text": row.get("Intelligence 1 Text", ""),
            "intelligence_2_text": row.get("Intelligence 2 Text", ""),
            "intelligence_3_text": row.get("Intelligence 3 Text", ""),

            "learning_style_1": row.get("Learning Style 1", ""),
            "learning_style_2": row.get("Learning Style 2", ""),
            "learning_style_3": row.get("Learning Style 3", ""),
            "learning_style": ls_summary_val,
            
            "enjoys_with_1": row.get("Enjoys With 1", ""),
            "enjoys_with_2": row.get("Enjoys With 2", ""),
            "enjoys_with_3": row.get("Enjoys With 3", ""),
            "struggles_with_1": row.get("Struggles With 1", ""),
            "struggles_with_2": row.get("Struggles With 2", ""),
            "struggles_with_3": row.get("Struggles With 3", ""),
            
            "soi_1": row.get("SOI 1", ""),
            "soi_2": row.get("SOI 2", ""),
            "soi_3": row.get("SOI 3", ""),
            "soi_4": row.get("SOI 4", ""),
            "soi_5": row.get("SOI 5", ""),

            "career_asp_1": row.get("Career Asp 1", ""),
            "career_asp_2": row.get("Career Asp 2", ""),
            "career_asp_3": row.get("Career Asp 3", ""),
            "career_asp_4": row.get("Career Asp 4", ""),

            "ability_1": row.get("Ability 1", ""),
            "ability_2": row.get("Ability 2", ""),
            "ability_3": row.get("Ability 3", ""),
            "ability_4": row.get("Ability 4", ""),

            "values_1": row.get("Value 1", ""),
            "values_2": row.get("Value 2", ""),
            "values_3": row.get("Value 3", ""),
            "values_4": row.get("Value 4", ""),

            "pathway_1": row.get("Suitability 1", ""),
            "pathway_2": row.get("Suitability 2", ""),
            "pathway_3": row.get("Suitability 3", ""),
            "pathway_4": row.get("Suitability 4", ""),
            "pathway_5": row.get("Suitability 5", ""),
            "pathway_6": row.get("Suitability 6", ""),
            "pathway_7": row.get("Suitability 7", ""),
            "pathway_8": row.get("Suitability 8", ""),
            "pathway_9": row.get("Suitability 9", ""),

            "pathway_1_text": row.get("Pathway 1 Text", ""),
            "cp1_soi_has": row.get("CP1 SOI Has", ""),
            "cp1_soi_lacks": row.get("CP1 SOI Lacks", ""),
            "cp1_values_has": row.get("CP1 Value Has", ""),
            "cp1_values_lacks": row.get("CP1 Value Lacks", ""),
            "cp1_ability_has": row.get("CP1 Ability Has", ""),
            "cp1_ability_lacks": row.get("CP1 Ability Lacks", ""),
            "cp1_personality_has": row.get("CP1 Personality Has", ""),
            "cp1_personality_lacks": row.get("CP1 Personality Lacks", ""),
            "cp1_intelligence_has": row.get("CP1 Intelligence Has", ""),
            "cp1_intelligence_lacks": row.get("CP1 Intelligence Lacks", ""),
            "cp1_subjects": row.get("Pathway 1 Subjects", ""),
            "cp1_skills": row.get("Pathway 1 Skills", ""),
            "cp1_courses": row.get("Pathway 1 Courses", ""),
            "cp1_exams": row.get("Pathway 1 Exams", ""),

            "pathway_2_text": row.get("Pathway 2 Text", ""),
            "cp2_soi_has": row.get("CP2 SOI Has", ""),
            "cp2_soi_lacks": row.get("CP2 SOI Lacks", ""),
            "cp2_values_has": row.get("CP2 Value Has", ""),
            "cp2_values_lacks": row.get("CP2 Value Lacks", ""),
            "cp2_ability_has": row.get("CP2 Ability Has", ""),
            "cp2_ability_lacks": row.get("CP2 Ability Lacks", ""),
            "cp2_personality_has": row.get("CP2 Personality Has", ""),
            "cp2_personality_lacks": row.get("CP2 Personality Lacks", ""),
            "cp2_intelligence_has": row.get("CP2 Intelligence Has", ""),
            "cp2_intelligence_lacks": row.get("CP2 Intelligence Lacks", ""),
            "cp2_subjects": row.get("Pathway 2 Subjects", ""),
            "cp2_skills": row.get("Pathway 2 Skills", ""),
            "cp2_courses": row.get("Pathway 2 Courses", ""),
            "cp2_exams": row.get("Pathway 2 Exams", ""),

            "pathway_3_text": row.get("Pathway 3 Text", ""),
            "cp3_soi_has": row.get("CP3 SOI Has", ""),
            "cp3_soi_lacks": row.get("CP3 SOI Lacks", ""),
            "cp3_values_has": row.get("CP3 Value Has", ""),
            "cp3_values_lacks": row.get("CP3 Value Lacks", ""),
            "cp3_ability_has": row.get("CP3 Ability Has", ""),
            "cp3_ability_lacks": row.get("CP3 Ability Lacks", ""),
            "cp3_personality_has": row.get("CP3 Personality Has", ""),
            "cp3_personality_lacks": row.get("CP3 Personality Lacks", ""),
            "cp3_intelligence_has": row.get("CP3 Intelligence Has", ""),
            "cp3_intelligence_lacks": row.get("CP3 Intelligence Lacks", ""),
            "cp3_subjects": row.get("Pathway 3 Subjects", ""),
            "cp3_skills": row.get("Pathway 3 Skills", ""),
            "cp3_courses": row.get("Pathway 3 Courses", ""),
            "cp3_exams": row.get("Pathway 3 Exams", ""),

            "can_at_school": row.get("Future Suggestions At School", ""),
            "can_at_home": row.get("Future Suggestions At Home", ""),
            "recommendations": format_recommendations(row.get("Recommendations", "")),
            "weak_ability": row.get("Weak_Ability", ""),
        }

        # Render HTML
        html_content = template.render(context)
        filename = build_report_filename(
            student_name,
            suffix="Career-9_Stream Navigator",
            roll_number=row.get("Roll Number", ""),
            uid=row.get("UID", ""),
            extension=".html"
        )
        output_path = os.path.join(report_dir, filename)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        logging.info(f"Generated HTML report for {student_name} at {output_path}")
        
        # Add to generated list (relative path for API)
        # We want path relative to project root or report-gen root?
        # The API will need to serve it. Let's store relative to report-gen root.
        rel_path = os.path.relpath(output_path, start=PROJECT_ROOT)
        generated_reports.append({
            "student_name": student_name,
            "filename": filename,
            "path": rel_path,
            "school": str(row.get("School", "")),
            "class": str(row.get("Class", ""))
        })

        processed_count += 1
        if REPORT_LIMIT and processed_count >= REPORT_LIMIT:
            break

    except Exception as e:
        logging.error(f"Error processing record {index + 1} for {student_name}: {e}")

# Output JSON result for the orchestrator/API to pick up
print(f"JSON_RESULT:{json.dumps(generated_reports)}")
