#!/usr/bin/env python3
"""Generate an XLSX file with all assessment questions and options, one sheet per assessment type."""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# ── Styling ──────────────────────────────────────────────────────────────────
HEADER_FONT = Font(bold=True, size=12, color="FFFFFF")
HEADER_FILL = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
SECTION_FONT = Font(bold=True, size=14, color="1E3A5F")
SECTION_FILL = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
THIN_BORDER = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin"),
)

def style_header_row(ws, row, num_cols):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
        cell.border = THIN_BORDER

def style_section_header(ws, row, num_cols, title):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=num_cols)
    cell = ws.cell(row=row, column=1, value=title)
    cell.font = SECTION_FONT
    cell.fill = SECTION_FILL
    cell.alignment = Alignment(horizontal="left")

def style_data_cell(cell, wrap=True):
    cell.alignment = Alignment(wrap_text=wrap, vertical="top")
    cell.border = THIN_BORDER

# ── Data ─────────────────────────────────────────────────────────────────────

subjects = [
    ("Agriculture", "Study of farming, crops, livestock, and food production."),
    ("Art", "Creative expression through painting, drawing, sculpture, and design."),
    ("Cultural Studies", "Understanding societies, cultures, and their histories."),
    ("English", "Language skills, literature, and communication."),
    ("Finance", "Money management, banking, investing, and economics."),
    ("Health", "Physical and mental well-being, nutrition, and healthcare."),
    ("Home and Consumer Science", "Cooking, budgeting, and daily life skills."),
    ("Languages", "Learning regional and foreign languages."),
    ("Management", "Leadership, planning, and organizational skills."),
    ("Mathematics", "Numbers, logic, problem-solving, and analysis."),
    ("Music", "Singing, instruments, music theory, and performance."),
    ("Science", "Biology, chemistry, physics, and experiments."),
    ("Social Sciences", "History, geography, politics, and society."),
    ("Technology", "Computers, programming, AI, and modern tech."),
    ("Vocational Studies", "Skill-based practical training in trades and careers."),
]

values = [
    ("Lucrative Salary", "A career that offers high financial rewards and monetary benefits."),
    ("Job Security", "A stable and long-term career path with minimal risk of unemployment."),
    ("Variety and Diversity", "Opportunities to engage in diverse tasks and experiences."),
    ("Building Relations", "Focus on communication, empathy, and human interaction."),
    ("High Achievement", "Pursuit of success, recognition, and significant accomplishments."),
    ("Autonomy", "The ability to work independently and make personal decisions."),
    ("Hands on activities", "Engaging in practical and physical tasks."),
    ("Prestige/Recognition", "Being known, respected, or admired in your profession."),
    ("Creativity", "Opportunities to express original ideas and innovative thinking."),
    ("Mental Activity", "Challenging the mind with critical thinking and problem-solving."),
    ("Physical Activity", "Active, movement-based work rather than sedentary tasks."),
    ("Leadership", "Taking initiative, guiding others, and making decisions."),
    ("Routine Activity", "Consistent and predictable daily tasks."),
    ("Supervised Work", "Working under clear direction and guidance from others."),
    ("Working Conditions", "A comfortable, supportive, and safe work environment."),
]

ability_questions = [
    ("Speed and accuracy", "During exam…",
     ["I finish my paper on time with no error. (4)", "I finish quickly but possibly make some errors. (3)",
      "I need a little extra time. (2)", "I never finish my paper in time. (1)"]),
    ("Computational", "To calculate daily math with two-digit numbers (+,-,*,/)…",
     ["I can do it in my mind accurately. (4)", "I use my fingers. (3)",
      "I do it with paper and pencil. (2)", "I need help of a calculator. (1)"]),
    ("Creativity / Artistic", "Given a blank piece of paper…",
     ["I can very easily think of something to draw or create. (4)", "I would like to draw or create. (3)",
      "I would take a while to think and draw something. (2)", "I am not good with drawing. (1)"]),
    ("Language/ Communication", "When learning a new language?",
     ["I can quickly learn new words. (4)", "I take some time to learn new words. (3)",
      "I simply mug up the new words. (2)", "It's difficult to remember new words. (1)"]),
    ("Technical", "Setting up and configuring new devices, like printers, electric games, or smart home gadgets…",
     ["I easily set up a new device. (4)", "With little help, I can do it. (3)",
      "I follow manual step by step. (2)", "I don't find it handy, always need help. (1)"]),
    ("Decision making & problem solving", "When there is a conflict with a friend…",
     ["I resolve it calmly and find a fair solution. (4)", "I try to resolve it but sometimes need help. (3)",
      "I often need an elder or other friend's help to resolve it. (2)", "I avoid it or let it continue without resolving it. (1)"]),
    ("Finger dexterity", "During paper folding activities or chopping vegetables at home…",
     ["I make precise folds and manage detailing well. (4)", "I finish with minor errors or less precision. (3)",
      "I complete it but with less accuracy and more time. (2)", "I struggle and it often lacks detail. (1)"]),
    ("Form perception", "When looking at a complex diagram or chart…",
     ["I quickly understand all details and their relationships. (4)", "I understand most details but may miss a few. (3)",
      "I find it challenging and need help to interpret it. (2)", "I struggle to understand and often get confused. (1)"]),
    ("Logical reasoning", "When playing strategy games like chess or other video games…",
     ["I develop winning strategies and make successful decisions. (4)", "I do well but sometimes make less effective decisions. (3)",
      "I find it challenging and often adjust my strategies. (2)", "I struggle to create effective strategies and make slow progress. (1)"]),
    ("Motor movement", "When participating in a sport (e.g., basketball, kho-kho)…",
     ["I perform smoothly and excel in the sport. (4)", "I do well but have occasional coordination issues. (3)",
      "I find some movements challenging and need extra practice. (2)", "I struggle with coordination and basic movements. (1)"]),
    ("Speed and accuracy", "In a handwriting race...",
     ["I finish quickly and accurately. (4)", "I finish quickly but there are few spelling mistakes in copying. (3)",
      "I need extra time. (2)", "I could never finish in time. (1)"]),
    ("Computational", "To calculate the price of items after applying a certain percentage discount…",
     ["I can orally do it. (4)", "I need paper and pen. (3)",
      "It takes a lot of time to calculate. (2)", "I find it difficult and need a gadget to calculate. (1)"]),
    ("Creativity / Artistic", "When working on creative projects, like crafts or designing things…",
     ["I enjoy and try to create something unique. (4)", "I plan on something different but can't completely do it. (3)",
      "I think about something easy to do. (2)", "I borrow the idea from somewhere and do it. (1)"]),
    ("Language/ Communication", "During debates and group discussions...",
     ["I do extensive research and preparation. (4)", "I look up for basic concepts and present. (3)",
      "I share what I know. (2)", "I do not participate in debates and discussions. (1)"]),
    ("Technical", "Repairing a broken toy or gadget...",
     ["I always figure out and fix it myself. (4)", "Mostly I manage to fix it. (3)",
      "Sometimes I need help in fixing it. (2)", "I can't figure out myself as I am not good with gadgets. (1)"]),
    ("Decision making & problem solving", "When working on a group project…",
     ["I contribute ideas and help solve any problems that come up. (4)", "I contribute but sometimes struggle with problem-solving. (3)",
      "I rely on others to sort out the problems. (2)", "I find it hard to contribute and solve problems in the group. (1)"]),
    ("Finger dexterity", "When typing on a keyboard…",
     ["I type quickly and accurately with minimal errors. (4)", "I type quickly but make occasional errors. (3)",
      "I type slowly and often need to correct mistakes. (2)", "I find it challenging to type and frequently make errors. (1)"]),
    ("Form perception", "When reading a detailed map…",
     ["I easily identify all landmarks and features. (4)", "I identify most but sometimes get confused. (3)",
      "I have difficulty and need extra time. (2)", "I find it very hard to understand the map. (1)"]),
    ("Logical reasoning", "When comparing two arguments in debates…",
     ["I clearly identify which argument is stronger by analyzing both. (4)", "I usually find the stronger argument but might miss some details. (3)",
      "I find it hard to compare and often need help to decide. (2)", "I struggle to determine which argument is stronger. (1)"]),
    ("Motor movement", "When playing a musical instrument…",
     ["I play smoothly with precise control and consistency. (4)", "I play well but occasionally make minor errors. (3)",
      "I find it challenging and need extra practice. (2)", "I struggle with accuracy and coordination. (1)"]),
    ("Speed and accuracy", "In Physical training period, During obstacle races...",
     ["I complete the race in time with no error. (4)", "I finish quickly but make some error. (3)",
      "I need extra time, but make no error. (2)", "I find it difficult to complete the race. (1)"]),
    ("Computational", "Calculate the average score if the team scores 15, 20, 25, and 30 points in four games.",
     ["I can easily do it. (4)", "I need to think a lot orally. (3)",
      "I need paper and pencil. (2)", "I will prefer to do it on a calculator. (1)"]),
    ("Creativity / Artistic", "To express your ideas through art, whether it's drawing, painting, dancing or another form...",
     ["I prefer to design it on my own. (4)", "I need some reference point to get going. (3)",
      "I choose something that is already tried and tested. (2)", "I just can't get my mind around it. (1)"]),
    ("Language/ Communication", "When reading a story or article…",
     ["I understand most of the content. (4)", "I understand by referring to the rest of the text. (3)",
      "I refer to a dictionary or other sources. (2)", "I just want to get over with it. (1)"]),
    ("Technical", "Do you participate in extracurricular activities that involve mechanical reasoning, like robotics clubs or science fairs?",
     ["Yes, I always participate in such activities. (4)", "I participate if there are benefits included. (3)",
      "I participate only if it is compulsory. (2)", "I never take part in such activities. (1)"]),
    ("Decision making & problem solving", "When deciding on extracurricular activities…",
     ["I carefully choose the best fit based on my interests and time. (4)", "I consider factors but sometimes struggle to decide. (3)",
      "I need advice to make a decision and find it challenging. (2)", "I struggle to decide and often don't participate. (1)"]),
    ("Finger dexterity", "When making diagrams or artistic writing…",
     ["I produce clear, detailed drawings or writing with good control. (4)", "My work is generally clear but occasionally lacks precision. (3)",
      "I prefer to use stencils and scales and tracing. (2)", "I struggle to control the pencil or pen, making my work very messy. (1)"]),
    ("Form perception", "When interpreting a visual puzzle or pattern…",
     ["I quickly recognize and solve the pattern. (4)", "I recognize the pattern but take some time to solve it. (3)",
      "I find it challenging and need extra time. (2)", "I struggle to see the pattern and often can't solve it. (1)"]),
    ("Logical reasoning", "When questioning information that seems wrong or unclear…",
     ["I investigate and verify the information thoroughly. (4)", "I ask questions and try to clarify most points. (3)",
      "I need help to understand unclear information. (2)", "I often accept unclear information without questioning. (1)"]),
    ("Motor movement", "When learning or practicing martial arts or a new dance routine…",
     ["I execute movements smoothly with precise control and coordination. (4)", "I perform well but occasionally need extra practice for precision. (3)",
      "I find it challenging and often need help to improve. (2)", "I struggle with basic movements and frequently need assistance. (1)"]),
]

# Domain mapping for personality
DOMAIN_NAMES = {"R": "Realistic (Thinker)", "I": "Investigative (Doer)", "A": "Artistic", "S": "Social", "E": "Enterprising", "C": "Conventional"}

personality_6_8 = [
    ("I enjoy researching information for school projects or personal interests.", "I"),
    ("I like to participate in drawing competition rather than science fair.", "A"),
    ("I prefer to keep track of my homework and make sure it's completed on time.", "C"),
    ("I prefer learning through practical experiments rather than just listening to lectures.", "R"),
    ("I like to participate in debates or discussions to explore different viewpoints.", "I"),
    ("I like to participate in art or drama competition in school.", "A"),
    ("I enjoy social gatherings just to be with people.", "S"),
    ("I like planning birthday parties and get-togethers with friends.", "E"),
    ("I like keeping my school notes and textbooks neatly organized.", "C"),
    ("I enjoy building and assembling blocks of different shapes and sizes.", "R"),
    ("I enjoy solving math word problems.", "I"),
    ("I like to perform in social gatherings or annual functions.", "A"),
    ("I enjoy speaking in front of audiences.", "S"),
    ("I like to be a leader than a follower.", "E"),
    ("I prefer creating time table and maintaining routines.", "C"),
    ("I would enjoy gardening in field more than just studying about plants.", "R"),
    ("I like testing different ways to make a paper airplane instead of just reading about how they work.", "I"),
    ("I find it easy to ask others for help.", "S"),
    ("I can easily convince people.", "E"),
    ("I use diaries for managing tasks and schedules efficiently.", "C"),
    ("I would rather help cook dinner than just plan the menu.", "R"),
    ("I like to take on challenging projects that require deep thinking.", "I"),
    ("I like making greeting cards for my friends' birthdays rather than just buying them.", "A"),
    ("I enjoy volunteering in community service projects or at school events.", "S"),
    ("I like to start a new club or organize extracurricular activity at school.", "E"),
    ("I follow a set daily routine.", "C"),
    ("I like helping to set up for school plays and making sure everyone knows their roles.", "R"),
    ("I like exploring new topics with fun educational apps.", "I"),
    ("I love making fun videos and creating designs for my friends online.", "A"),
    ("I enjoy talking in front of my class and sharing my ideas during projects.", "S"),
    ("I like helping my friends with their projects and coming up with new ideas.", "E"),
    ("I enjoy organizing my homework and keeping track of my grades.", "C"),
    ("I like building blocks and making sure all the pieces fit perfectly.", "R"),
    ("I often spot small details in pictures and easily find differences in puzzles.", "I"),
    ("I love creating pattern drawings and learning about different art forms.", "A"),
    ("I like talking about different cultures and how people live around the world.", "S"),
    ("I enjoy being the team leader in group projects and helping my classmates understand things.", "E"),
    ("I like following step-by-step instructions for any task or activity.", "C"),
    ("I enjoy participating in sports.", "R"),
    ("I think carefully about what might happen before I decide what to do.", "I"),
    ("I enjoy creating posters and logos for school events and clubs.", "A"),
    ("I enjoy participating in awareness campaigns like, yoga day or cleanliness drive.", "S"),
    ("I like to take a lead in classroom activities like group projects.", "E"),
    ("I like to track my habits and organize my daily routines.", "C"),
    ("I enjoy building small things for myself like pen stand, science project or art and craft.", "R"),
    ("I like to imagine multiple ideas for a creativity project.", "A"),
    ("I enjoy making new friends or meeting different people.", "S"),
    ("I actively participate in political discussions and listen to political news.", "E"),
    ("I always set up my study area and cupboard properly.", "C"),
    ("I enjoy cleaning and organizing my room by myself.", "R"),
    ("I can figure out reasons if my friend is not sharing something with me.", "I"),
    ("I sing songs or play an instrument at school functions.", "A"),
    ("I enjoy working in group projects more than working alone.", "S"),
    ("I am able to convince other students to participate in any school activities and events.", "E"),
]

personality_9_12 = [
    ("I enjoy physical activities like hiking, biking, or playing sports more than reading novels.", "R"),
    ("I enjoy researching information for projects or personal interests.", "I"),
    ("I would like to design the cover page of my college magazine more than working on a data file.", "A"),
    ("Rather than working alone, I enjoy group projects or assignments.", "S"),
    ("I would rather be on the organising committee for an event than participate in dance competition.", "E"),
    ("I enjoy helping my family with budgeting and planning monthly expenses.", "C"),
    ("I like making small DIY items for decoration or everyday use.", "R"),
    ("I enjoy writing detailed reports or essays on my topics of interest.", "I"),
    ("I enjoy attending art exhibits, concerts, or theater performances.", "A"),
    ("I enjoy social gatherings just to be with people.", "S"),
    ("I like planning school events, fundraisers, or social gatherings.", "E"),
    ("I enjoy keeping my study notes neat and well-organized.", "C"),
    ("I like helping with household repairs or assembling furniture.", "R"),
    ("I often seek out information to satisfy my curiosity.", "I"),
    ("I love designing and decorating my own phone case.", "A"),
    ("I enjoy speaking in front of audiences.", "S"),
    ("I prefer creating schedules and maintaining routines.", "C"),
    ("I would enjoy plantation drive more than studying about plants.", "R"),
    ("I enjoy using a science kit to test how different reactions occur more than just reading about chemical reactions.", "I"),
    ("I find it easy to ask others for help.", "S"),
    ("I find it easy to influence people.", "E"),
    ("I'd rather help cook dinner than just plan the menu.", "R"),
    ("I find it interesting to investigate environmental issues and offer sustainable solutions.", "I"),
    ("I enjoy setting up and decorating booths for school exhibitions and fairs.", "A"),
    ("I enjoy volunteering in community service projects or cultural events.", "S"),
    ("I like to start a new club or organise extracurricular activity in campus.", "E"),
    ("I like to maintain the log of my monthly expenses.", "C"),
    ("I follow podcasts and YouTube channels that teach me about different topics.", "I"),
    ("I enjoy creating graphic designs and editing videos for my social media.", "A"),
    ("I feel confident giving presentations in class and leading group discussions.", "S"),
    ("I would like to take up small freelancing jobs and help businesses by using my skills.", "E"),
    ("I enjoy managing spreadsheets and organizing data for school projects.", "C"),
    ("I love working on robotics projects and programming machines.", "R"),
    ("I often catch errors in my essays or codes and notice small details in art or designs.", "I"),
    ("I enjoy studying modern art and creating abstract paintings.", "A"),
    ("I enjoy discussing social issues and learning about different communities or religious practices.", "S"),
    ("I feel confident running workshops and leading study groups for my peers.", "E"),
    ("I like adhering to guidelines and protocols in any situation.", "C"),
    ("I enjoy participating in outdoor activities like hiking and camping.", "R"),
    ("I enjoy developing digital content and/or branding strategies for school projects and clubs.", "A"),
    ("I take initiative in activities like street plays or mental health awareness campaigns.", "S"),
    ("I lead group projects and enjoy the responsibilities of a leader.", "E"),
    ("I like to organise my closet or plan on how will I spend my pocket money.", "C"),
    ("I enjoy painting and renovating old furniture or any other item to give it a new look.", "R"),
    ("If something is unfamiliar to me, I ensure to know about it in detail.", "I"),
    ("I like composing lyrics and writing scripts for school functions.", "A"),
    ("I enjoy talking to people to build connections.", "S"),
    ("I'm interested in pursuing a career in politics.", "E"),
    ("I like organizing my bookshelves and study area to keep everything in order.", "C"),
    ("I like working on my bike or scooter to keep it in good condition.", "R"),
    ("I am good at understanding reason behind people's actions.", "I"),
    ("I enjoy choreographing dance routines or planning other activities for cultural festivals and competitions.", "A"),
    ("I enjoy starting and leading new clubs or groups at school.", "E"),
    ("I prefer making to-do lists and following a timetable for my daily activities.", "C"),
]

mi_6_8 = [
    ("I play a sport or dance.", "Bodily-Kinesthetic"),
    ("I can throw things well - darts, skimming pebbles, frisbees, etc.", "Bodily-Kinesthetic"),
    ("I enjoy and am good at making things - I'm good with my hands.", "Bodily-Kinesthetic"),
    ("I find it easy to talk to new people.", "Interpersonal"),
    ("It upsets me to see someone cry and not be able to help.", "Interpersonal"),
    ("I prefer team sports.", "Interpersonal"),
    ("I like to learn more about myself.", "Intrapersonal"),
    ("I always know how I am feeling.", "Intrapersonal"),
    ("I keep a diary.", "Intrapersonal"),
    ("I find it easy to make up stories.", "Linguistic"),
    ("I often talk to myself – out loud or in my head.", "Linguistic"),
    ("I find pleasure in reading.", "Linguistic"),
    ("I enjoy logic puzzles such as 'sudoku'.", "Logical-Mathematical"),
    ("People behaving irrationally annoy me.", "Logical-Mathematical"),
    ("I don't use my fingers when I count.", "Logical-Mathematical"),
    ("I can play a musical instrument.", "Musical"),
    ("I can identify most sounds without seeing what causes them.", "Musical"),
    ("I have always dreamed of being a musician or singer.", "Musical"),
    ("I often see clear images when I close my eyes.", "Spatial-Visual"),
    ("My favourite subject at school was / is art.", "Spatial-Visual"),
    ("I can read a map easily.", "Spatial-Visual"),
    ("I prefer to watch wildlife documentaries or books related to it.", "Naturalistic"),
    ("I love to go for trekking or hiking.", "Naturalistic"),
    ("I enjoy collecting rocks, shells, leaves, or other things from nature.", "Naturalistic"),
]

mi_9_10 = [
    ("I love adrenaline sports and scary rides.", "Bodily-Kinesthetic"),
    ("I am a very tactile person.", "Bodily-Kinesthetic"),
    ("To learn something new, I need to just get on and try it.", "Bodily-Kinesthetic"),
    ("I can tell easily whether someone likes me or dislikes me.", "Interpersonal"),
    ("I am very aware of other people's body language.", "Interpersonal"),
    ("My friends always come to me for emotional support and advice.", "Interpersonal"),
    ("I can predict my feelings and behaviours in certain situations fairly accurately.", "Intrapersonal"),
    ("I am realistic about my strengths and weaknesses.", "Intrapersonal"),
    ("I am happy spending time alone.", "Intrapersonal"),
    ("When talking to someone, I tend to listen to the words they use not just what they mean.", "Linguistic"),
    ("I find it easy to remember quotes or phrases.", "Linguistic"),
    ("When I am abroad, I find it easy to pick up the basics of another language.", "Linguistic"),
    ("I don't like ambiguity, I like things to be clear.", "Logical-Mathematical"),
    ("I like to be systematic and thorough.", "Logical-Mathematical"),
    ("I find it easy to remember telephone numbers.", "Logical-Mathematical"),
    ("Music is very important to me.", "Musical"),
    ("I enjoy a wide variety of musical styles.", "Musical"),
    ("I like having music on in the background.", "Musical"),
    ("I can always recognise places that I have been before, even when I was very young.", "Spatial-Visual"),
    ("When I am concentrating I tend to doodle.", "Spatial-Visual"),
    ("My house is full of pictures and photographs.", "Spatial-Visual"),
    ("I love to take care of pet animals.", "Naturalistic"),
    ("I actively make effort to live environment friendly.", "Naturalistic"),
    ("I love bird-watching and learning about plants and trees.", "Naturalistic"),
]

mi_11_12 = [
    ("I find it easiest to solve problems when I am doing something physical.", "Bodily-Kinesthetic"),
    ("I have always been physically well co-ordinated.", "Bodily-Kinesthetic"),
    ("I never use instructions for flat-pack furniture.", "Bodily-Kinesthetic"),
    ("I am a very social person and like being with other people.", "Interpersonal"),
    ("I could manipulate people if I choose to.", "Interpersonal"),
    ("I am good at solving disputes between others.", "Interpersonal"),
    ("I like to meditate.", "Intrapersonal"),
    ("I am very interested in psychometrics (personality testing) and IQ tests.", "Intrapersonal"),
    ("I set myself goals and plans for the future.", "Intrapersonal"),
    ("I enjoy crosswords, word searches or other word puzzles.", "Linguistic"),
    ("I am a convincing liar.", "Linguistic"),
    ("I enjoy debates and discussions.", "Linguistic"),
    ("I find budgeting and managing my money easy.", "Logical-Mathematical"),
    ("I find mental arithmetic easy.", "Logical-Mathematical"),
    ("I like to think through a problem carefully, considering all the consequences.", "Logical-Mathematical"),
    ("I often have a song or piece of music in my head.", "Musical"),
    ("I find that the music that appeals to me is often based on how I feel emotionally.", "Musical"),
    ("At school I loved / love music lessons.", "Musical"),
    ("I find graphs and charts easy to understand.", "Spatial-Visual"),
    ("I can easily imagine how an object would look from another perspective.", "Spatial-Visual"),
    ("If I am learning how to do something, I like to see drawings and diagrams of how it works.", "Spatial-Visual"),
    ("I actively follow discussions about global environmental challenges.", "Naturalistic"),
    ("I have developed eco-friendly habits in daily life activities.", "Naturalistic"),
    ("I enjoy gardening or taking care of pet animals.", "Naturalistic"),
]

career_aspirations = [
    ("Architecture", "Designing and planning buildings and structures."),
    ("Engineering and Technology", "Applying scientific principles to innovate and solve problems."),
    ("Information Technology and Allied Fields", "Working with software, hardware, and digital systems."),
    ("Art, Design", "Visual and creative expression through various media."),
    ("Entertainment and Mass Media", "Creating and delivering content across platforms."),
    ("Sports", "Physical competition and athletic performance."),
    ("Entrepreneurship", "Creating and running your own business or startup."),
    ("Management and Administration", "Organizing and leading people or projects efficiently."),
    ("Banking & Finance", "Managing money, investments, and economic activities."),
    ("Hospitality and Tourism", "Travel, accommodation, and customer experience industries."),
    ("Community and Social Service", "Helping individuals and communities improve their lives."),
    ("Social Science/ Humanities", "Studying society, history, politics, and cultures."),
    ("Education and Training", "Teaching, mentoring, and developing learning systems."),
    ("Agriculture and Food", "Farming, food science, and sustainable practices."),
    ("Paramedical", "Support roles in healthcare, like radiology or physiotherapy."),
    ("Law Studies", "Legal systems, rights, and the justice process."),
    ("Life Sciences /Medicine and Healthcare", "Biology, medical treatment, and health research."),
    ("Defense/ Protective Service", "Military, police, and emergency response roles."),
    ("Personal Care and Services", "Providing grooming, wellness, or lifestyle assistance."),
    ("Sales", "Selling products or services to customers."),
    ("Government and Public Administration", "Policy making and governance roles."),
    ("Science and Mathematics", "Analytical and theoretical exploration of the natural world."),
    ("Marketing", "Promoting and communicating the value of products or brands."),
    ("Environmental Service", "Sustainability, conservation, and environmental protection."),
]


# ── Sheet builders ───────────────────────────────────────────────────────────

def add_section_a(ws, row):
    """Subjects of Interest - select 5"""
    style_section_header(ws, row, 4, "SECTION A — Subjects of Interest (Select 5)")
    row += 1
    headers = ["#", "Subject", "Description", "Type"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (name, info) in enumerate(subjects, 1):
        for c, val in enumerate([i, name, info, "Selection"], 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1  # blank row


def add_section_b(ws, row):
    """Values - select 5"""
    style_section_header(ws, row, 4, "SECTION B — Values (Select 5)")
    row += 1
    headers = ["#", "Value", "Description", "Type"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (name, info) in enumerate(values, 1):
        for c, val in enumerate([i, name, info, "Selection"], 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1


def add_section_c(ws, row):
    """Ability Assessment - 30 questions, 4 options"""
    style_section_header(ws, row, 7, "SECTION C — Ability Assessment (30 Questions)")
    row += 1
    headers = ["#", "Ability", "Question", "Option A (4 pts)", "Option B (3 pts)", "Option C (2 pts)", "Option D (1 pt)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (ability, question, options) in enumerate(ability_questions, 1):
        vals = [i, ability, question] + options
        for c, val in enumerate(vals, 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1


def add_section_d(ws, row, personality_data, label):
    """Personality Assessment - Yes/No (RIASEC)"""
    style_section_header(ws, row, 5, f"SECTION D — Personality Assessment [{label}] ({len(personality_data)} Questions, Yes/No)")
    row += 1
    headers = ["#", "Question", "Domain", "Option 1 (Yes = 2 pts)", "Option 2 (No = 1 pt)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (question, domain) in enumerate(personality_data, 1):
        vals = [i, question, DOMAIN_NAMES.get(domain, domain), "Yes", "No"]
        for c, val in enumerate(vals, 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1


def add_section_e(ws, row, mi_data, label):
    """Multiple Intelligence Assessment"""
    style_section_header(ws, row, 7, f"SECTION E — Multiple Intelligence Assessment [{label}] ({len(mi_data)} Questions)")
    row += 1
    headers = ["#", "Question", "Intelligence Type", "Strongly Agree (4)", "Agree (3)", "Disagree (2)", "Strongly Disagree (1)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (question, intel_type) in enumerate(mi_data, 1):
        vals = [i, question, intel_type, "Strongly Agree", "Agree", "Disagree", "Strongly Disagree"]
        for c, val in enumerate(vals, 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1


def add_section_f(ws, row):
    """Career Aspirations - select 4 (only for 9+)"""
    style_section_header(ws, row, 4, "SECTION F — Career Aspirations (Select 4)")
    row += 1
    headers = ["#", "Career Field", "Description", "Type"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=row, column=c, value=h)
    style_header_row(ws, row, len(headers))
    row += 1
    for i, (name, info) in enumerate(career_aspirations, 1):
        for c, val in enumerate([i, name, info, "Selection"], 1):
            cell = ws.cell(row=row, column=c, value=val)
            style_data_cell(cell)
        row += 1
    return row + 1


def set_column_widths(ws):
    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 40
    ws.column_dimensions["C"].width = 45
    ws.column_dimensions["D"].width = 45
    ws.column_dimensions["E"].width = 40
    ws.column_dimensions["F"].width = 40
    ws.column_dimensions["G"].width = 40


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    wb = Workbook()

    # Sheet 1: Class 6-8 (Insight Navigator)
    ws1 = wb.active
    ws1.title = "Class 6-8 (Insight Navigator)"
    set_column_widths(ws1)
    row = 1
    row = add_section_a(ws1, row)
    row = add_section_b(ws1, row)
    row = add_section_c(ws1, row)
    row = add_section_d(ws1, row, personality_6_8, "Class 6-8")
    row = add_section_e(ws1, row, mi_6_8, "Class 6-8")

    # Sheet 2: Class 9-10 (Stream Navigator)
    ws2 = wb.create_sheet("Class 9-10 (Stream Navigator)")
    set_column_widths(ws2)
    row = 1
    row = add_section_a(ws2, row)
    row = add_section_b(ws2, row)
    row = add_section_c(ws2, row)
    row = add_section_d(ws2, row, personality_9_12, "Class 9-12")
    row = add_section_e(ws2, row, mi_9_10, "Class 9-10")
    row = add_section_f(ws2, row)

    # Sheet 3: Class 11-12 (Career Navigator)
    ws3 = wb.create_sheet("Class 11-12 (Career Navigator)")
    set_column_widths(ws3)
    row = 1
    row = add_section_a(ws3, row)
    row = add_section_b(ws3, row)
    row = add_section_c(ws3, row)
    row = add_section_d(ws3, row, personality_9_12, "Class 9-12")
    row = add_section_e(ws3, row, mi_11_12, "Class 11-12")
    row = add_section_f(ws3, row)

    output = "assessment_questions.xlsx"
    wb.save(output)
    print(f"Generated: {output}")


if __name__ == "__main__":
    main()
