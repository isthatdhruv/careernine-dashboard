import logging
from docxtpl import DocxTemplate, InlineImage
from docx.oxml import OxmlElement
from docx.shared import Pt

from docx.shared import Cm
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.colors as mcolors
from docxtpl import RichText
from report_path_utils import get_report_path, convert_docx_to_pdf, build_report_filename

def format_recommendations(text):
    """Formats recommendations so that only the text before the colon is bold,
    each recommendation on its own line, without bullets."""
    from docxtpl import RichText
    if not text:
        return ""
    
    rt = RichText()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    for idx, line in enumerate(lines):
        if idx > 0:
            rt.add("\n")
        if ":" in line:
            heading, desc = line.split(":", 1)
            rt.add(heading.strip(), bold=True)
            rt.add(": " + desc.strip(), bold=False)
        else:
            rt.add(line, bold=False)
    
    return rt




# -------------------------------
# Setup Logging Configuration
# -------------------------------
logging.basicConfig(
    level=logging.INFO,  # Keep only essential logs
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info("Starting the report generation process.")

# -------------------------------
# Configuration
# -------------------------------
TEMPLATE_PATH = "../Templates/6-8.docx"  # Word template
EXCEL_PATH = "../input.xlsx"   # Our master sheet
SHEET_NAME = "Master_Sheet"  # Our master sheet name
OUTPUT_DIR = "../Reports/english"             # Directory to save reports
GRAPH_PERSONALITY_DIR = "../graphs/class_6-8/personality"  # Directory for personality graphs
GRAPH_INTELLIGENCE_DIR = "../graphs/class_6-8/intelligence"  # Directory for intelligence graphs

# Create necessary directories
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(GRAPH_PERSONALITY_DIR, exist_ok=True)
os.makedirs(GRAPH_INTELLIGENCE_DIR, exist_ok=True)
logging.info(f"Directories '{OUTPUT_DIR}', '{GRAPH_PERSONALITY_DIR}', and '{GRAPH_INTELLIGENCE_DIR}' are ready.")

# Load the Excel data and replace NaN with an empty string
try:
    data = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME).fillna("")  # Replace all NaN values with empty strings
    logging.info(f"Excel data loaded successfully. Total records: {len(data)}")
except Exception as e:
    logging.error(f"Failed to read Excel file: {EXCEL_PATH}. Exception: {e}")
    raise

# -------------------------------
# Function to Generate Personality Graph
# -------------------------------
def create_personality_graph(student_name, scores, categories):
    """
    Creates a personality traits graph with a gradient color style.
    """
    graph_path = os.path.join(GRAPH_PERSONALITY_DIR, f"personality_graph_{student_name}.png")

    fig, ax = plt.subplots(figsize=(6.9, 2))  # Set precise width and height

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
    new_categories = [category_mapping[cat] for cat in categories]

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

    # Save graph
    plt.savefig(graph_path, bbox_inches='tight', transparent=True)
    plt.close()

    logging.info(f"Personality graph saved for {student_name} at {graph_path}")
    return graph_path


# -------------------------------
# Page Break
# -------------------------------
def insert_page_break():
    """Creates a page break that is correctly inserted in a Word document."""
    br = OxmlElement("w:br")
    br.set("w:type", "page")  # Specify that this is a page break
    return br


# -------------------------------
# Function to Generate Intelligence Graph
# -------------------------------
def create_intelligence_graph(student_name, scores, categories):
    """
    Creates an intelligence graph with gradient colors.
    """
    graph_path = os.path.join(GRAPH_INTELLIGENCE_DIR, f"intelligence_graph_{student_name}.png")

    fig, ax = plt.subplots(figsize=(6.9, 2))

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

    # Save graph
    plt.savefig(graph_path, bbox_inches='tight', transparent=True)
    plt.close()

    logging.info(f"Intelligence graph saved for {student_name} at {graph_path}")
    return graph_path

# Define the directory where images are stored
IMAGE_DIR = "../images/"  # Adjust this to your actual image directory

def get_inline_image(doc, image_name):
    """Returns an InlineImage object if the image exists, else None."""
    if image_name and isinstance(image_name, str):  # Ensure valid image name
        image_path = os.path.join(IMAGE_DIR, image_name)
        if os.path.exists(image_path):  # Check if image file exists
            return InlineImage(doc, image_path, Cm(4))  # Adjust size as needed
        else:
            logging.warning(f"Image not found: {image_path}")
    return None  # Return None if no valid image


# -------------------------------
# Process Each Student Record
# -------------------------------
# Optional limit via env var to restrict number of reports in a run
limit_env = os.getenv("REPORT_LIMIT")
try:
    REPORT_LIMIT = int(limit_env) if limit_env else None
except Exception:
    REPORT_LIMIT = None
processed_count = 0
for index, row in data.iterrows():
    try:
        # Only process students in class 6-8
        if row.get("Class") not in [6, 7, 8]:
            print(f"Skipping {row.get('Name','Unknown')} - not in class 6-8")
            continue
        # Require AI summaries before generating any report for this student
        ai_summary_val = str(row.get("AI_Summary", row.get("AI Summary", "")) or "").strip()
        ls_summary_val = str(row.get("Learning_Style_Summary", row.get("Learning Style Summary", "")) or "").strip()
        if not ai_summary_val or not ls_summary_val:
            logging.warning(f"Skipping {row.get('Name','Unknown')}: missing AI summaries (AI_Summary/Learning_Style_Summary)")
            continue
        student_name = row.get("Name", "Unknown")
        logging.info(f"Processing record {index + 1}/{len(data)}: {student_name}")

        # Load the Word template
        doc = DocxTemplate(TEMPLATE_PATH)

        # Format the Date of Birth (DOB)
        dob_value = row.get("DOB")
        if pd.notnull(dob_value):
            try:
                dob_formatted = dob_value.strftime('%d/%m/%Y')
            except Exception:
                dob_formatted = str(dob_value)  # Fallback to raw value if format fails
        else:
            dob_formatted = ''

        # Personality Trait Categories
        personality_categories = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"]

        # Intelligence Categories to DISPLAY (canonical labels)
        base_intelligence_categories = [
            "Bodily-Kinesthetic", "Intrapersonal", "Interpersonal", "Linguistic",
            "Logical-Mathematical", "Musical", "Visual-Spatial"
        ]
        intelligence_categories = list(base_intelligence_categories)
        try:
            naturalistic_score = float(row.get("Naturalistic", 0) or 0)
        except Exception:
            naturalistic_score = 0.0
        if naturalistic_score > 0:
            intelligence_categories.append("Naturalistic")

        # Use stanine scores for personality graph (1-9 scale)
        personality_scores = [float(row.get(f"Stanine_{cat}", 0) or 0) for cat in personality_categories]
        # Map canonical labels to possible column name aliases in data
        alias_map = {
            "Logical-Mathematical": ["Logical-Mathematical", "Logical", "Logical Reasoning", "logical-mathematical", "logical"],
            "Visual-Spatial": ["Visual-Spatial", "Spatial-Visual", "Visual Spatial", "Spatial Visual", "visual-spatial", "spatial-visual"],
            "Bodily-Kinesthetic": ["Bodily-Kinesthetic", "Bodily Kinesthetic", "bodily-kinesthetic"],
            "Intrapersonal": ["Intrapersonal"],
            "Interpersonal": ["Interpersonal"],
            "Linguistic": ["Linguistic", "Verbal-Linguistic", "Verbal Linguistic"],
            "Musical": ["Musical"],
            "Naturalistic": ["Naturalistic"]
        }

        def get_score(canonical_label: str):
            for key in alias_map.get(canonical_label, [canonical_label]):
                val = row.get(key, None)
                if val not in (None, ""):
                    try:
                        return float(val)
                    except Exception:
                        continue
            return 0.0

        intelligence_scores = [get_score(cat) for cat in intelligence_categories]
        
        # Generate personality and intelligence graphs
        personality_graph_path = create_personality_graph(student_name, personality_scores, personality_categories)
        intelligence_graph_path = create_intelligence_graph(student_name, intelligence_scores, intelligence_categories)

        

        # -------------------------------
        # Create Context for Word Template
        # -------------------------------
        context = {
            "name_caps": row.get("Name_Caps", ""),
            "name": row.get("Name", ""),
            "f_name": row.get("First Name", ""),
            "class": row.get("Class", ""),
            "email": row.get("Email", ""),
            "school": row.get("School", ""),
            "dob": dob_formatted,
            "summary": ai_summary_val,
            "page_break": "\f",  # Use "\f" to indicate a page break in Jinja2

            "personality_1_text": row.get("Personality 1 Text", ""),
            "personality_2_text": row.get("Personality 2 Text", ""),
            "personality_3_text": row.get("Personality 3 Text", ""),

            "personality_1_image": get_inline_image(doc, row.get("Personality 1 Image", "")),
            "personality_2_image": get_inline_image(doc, row.get("Personality 2 Image", "")),
            "personality_3_image": get_inline_image(doc, row.get("Personality 3 Image", "")),
            
            
            "intelligence_1_image": get_inline_image(doc, row.get("Intelligence 1 Image", "")),
            "intelligence_2_image": get_inline_image(doc, row.get("Intelligence 2 Image", "")),
            "intelligence_3_image": get_inline_image(doc, row.get("Intelligence 3 Image", "")),

            "intelligence_1_text": row.get("Intelligence 1 Text", ""),
            "intelligence_2_text": row.get("Intelligence 2 Text", ""),
            "intelligence_3_text": row.get("Intelligence 3 Text", ""),


            "learning_style_1": row.get("Learning Style 1", ""),
            "learning_style_2": row.get("Learning Style 2", ""),
            "learning_style_3": row.get("Learning Style 3", ""),
            "learning_style": row.get("Learning Style Summary", ""),
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
            "ability_5": row.get("Ability 5", ""),

            "values_1": row.get("Value 1", ""),
            "values_2": row.get("Value 2", ""),
            "values_3": row.get("Value 3", ""),
            "values_4": row.get("Value 4", ""),
            "values_5": row.get("Value 5", ""),

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

            "result": row.get("Result", ""),

            "can_at_school": row.get("Future Suggestions At School", ""),
            "can_at_home": row.get("Future Suggestions At Home", ""),
            "recommendations": format_recommendations(row.get("Recommendations", "")),  # Apply formatting
            "weak_ability": row.get("Weak Ability", ""),
            "personality_graph": InlineImage(doc, personality_graph_path, Cm(18)),  # Insert resized graph
            "intelligence_graph": InlineImage(doc, intelligence_graph_path, Cm(18)),  # Insert resized graph
        }

        # Render the document with the context
        doc.render(context)

        # Save the generated report
        # Get School, Class, Section for organized folder structure
        school = row.get("School", None)
        class_val = row.get("Class", None)
        section = row.get("Section", None)
        
        # Get organized path (School > Class > Section)
        report_dir = get_report_path(school, class_val, section, base_dir="../Reports/english") if (school or class_val or section) else OUTPUT_DIR
        logging.info(f"Using organized path: {report_dir} for {student_name}")
        
        # Build DOCX filename
        docx_filename = os.path.join(
            report_dir,
            build_report_filename(
                student_name,
                suffix="Career-9_Insight Navigator",
                roll_number=row.get("Roll Number", ""),
                uid=row.get("UID", ""),
                extension=".docx"
            )
        )
        
        # Build PDF filename
        pdf_filename = os.path.join(
            report_dir,
            build_report_filename(
                student_name,
                suffix="Career-9_Insight Navigator",
                roll_number=row.get("Roll Number", ""),
                uid=row.get("UID", ""),
                extension=".pdf"
            )
        )
        
        # Save DOCX (skip if already exists)
        if os.path.exists(docx_filename):
            logging.info(f"Skipping DOCX (already exists) for {student_name}: {docx_filename}")
        else:
            doc.save(docx_filename)
            logging.info(f"Generated DOCX report for {student_name} at {docx_filename}")
        
        # Disable PDF generation by default to avoid macOS permission popups
        GENERATE_PDF = os.getenv("GENERATE_PDF") == "1"
        if GENERATE_PDF and os.path.exists(docx_filename):
            if convert_docx_to_pdf(docx_filename, pdf_filename):
                logging.info(f"Generated PDF report for {student_name} at {pdf_filename}")
            else:
                logging.warning(f"PDF conversion failed for {student_name}. DOCX available at {docx_filename}")

        # Honor limit if set
        processed_count += 1
        if REPORT_LIMIT and processed_count >= REPORT_LIMIT:
            logging.info(f"REPORT_LIMIT reached ({REPORT_LIMIT}). Stopping.")
            break

    except Exception as e:
        logging.error(f"Error processing record {index + 1} for {student_name}: {e}")
