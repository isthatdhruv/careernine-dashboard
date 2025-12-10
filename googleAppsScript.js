function generateMasterSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName('Raw Data');
  if (!rawSheet) {
    throw new Error('Sheet "Raw Data" not found.');
  }

  var values = rawSheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('Raw Data has no data.');
  }

  // Header row
  var header = values[0];
  var dataRows = values.slice(1);

  // Map header name -> index
  var colIndex = {};
  header.forEach(function(name, idx) {
    colIndex[String(name).trim()] = idx;
  });

  // ===== LABEL ARRAYS (fixed, taken from your file) =====
  var CAREER_LABELS = [
    "Architecture",
    "Art, Design",
    "Entertainment and Mass Media ",
    "Management and Administration",
    "Banking and Finance",
    "Law Studies ",
    "Government and Public Administration",
    "Marketing ",
    "Entrepreneurship",
    "Sales",
    "Science and Mathematics",
    "Computer Science, IT and Allied Fields ",
    "Life Sciences /Medicine and Healthcare",
    "Environmental Service",
    "Social Sciences and Humanities",
    "Defence/ Protective Service",
    "Sports",
    "Engineering and Technology",
    "Agriculture, Food Industry and Forestry ",
    "Education and Training",
    "Paramedical",
    "Hospitality and Tourism  ",
    "Community and Social Service",
    "Personal Care and Services "
  ];

  var VALUE_LABELS = [
    "Lucrative Salary",
    "Job Security ",
    "Variety and Diversity",
    "Building Relations",
    "High achievement",
    "Autonomy",
    "Hands on activities",
    "Prestige/ Recognition",
    "Creativity",
    "Mental Activity",
    "Physical Activity",
    "Leadership",
    "Routine Activity",
    "Supervised Work ",
    "Working Conditions"
  ];

  var SOI_LABELS = [
    "Agriculture",
    "Art",
    "Cultural Studies",
    "English",
    "Home and Consumer Science",
    "Finance",
    "Health",
    "Languages",
    "Management",
    "Mathematics",
    "Music",
    "Science",
    "Vocational studies",
    "Social Sciences",
    "Technology"
  ];

  // Multiple Intelligence labels
  var MI_LABELS = [
    "Bodily-Kinesthetic ",
    "Interpersonal ",
    "Intrapersonal ",
    "Linguistic ",
    "Logical-Mathematical ",
    "Musical ",
    "Visual-Spatial",
    "Naturalistic "
  ];

  // Aptitude labels in Master Sheet order
  var APT_LABELS = [
    "Speed and accuracy ",
    "Computational",
    "Creativity /Artistic ",
    "Language/ Communication ",
    "Technical ",
    "Decision making & problem solving ",
    "Finger dexterity ",
    "Form perception ",
    "Logical reasoning ",
    "Motor movement "
  ];

  // Helper: normalize cell value to string
  function norm(val) {
    if (val === null || val === undefined) return "";
    return String(val).trim().toUpperCase();
  }

  // Helper: check if selected (for Sec_A/B/C: 1, "1", YES, Y)
  function isSelected(val) {
    var v = norm(val);
    return (v === "1" || v === "YES" || v === "Y");
  }

  // Weights for Section E (aptitude)
  var E_WEIGHTS = {
    "A": 4,
    "B": 3,
    "C": 3,
    "D": 1
    // anything else -> 0
  };

  // Weights for Section F (MI)
  var F_WEIGHTS = {
    "A": 4,
    "B": 3,
    "C": 2,
    "D": 1
    // anything else -> 0
  };

  // Question index groups for Section E (1-based indices)
  var E_GROUPS = {
    "Speed and accuracy ": [1, 11, 21],
    "Computational": [2, 12, 22],
    "Creativity /Artistic ": [3, 13, 23],
    "Language/ Communication ": [4, 14, 24],
    "Technical ": [5, 15, 25],
    "Decision making & problem solving ": [6, 16, 26],
    "Finger dexterity ": [7, 17, 27],
    "Form perception ": [8, 18, 28],
    "Logical reasoning ": [9, 19, 29],
    "Motor movement ": [10, 20, 30]
  };

  var RIASEC_LETTERS = ["R", "I", "A", "S", "E", "C"];

  // Pre-get column indexes for sec signals to avoid string lookups inside loops
  function idx(name) {
    var i = colIndex[name];
    if (i === undefined) {
      throw new Error("Column not found in Raw Data: " + name);
    }
    return i;
  }

  // Build output 2D array
  var output = [];

  // Header row for Master Sheet
  var masterHeader = [
    "School",
    "Section",
    "Roll Number",
    "Name",
    "Class"
  ]
  .concat(MI_LABELS)                // 8 MI columns
  .concat(APT_LABELS)               // 10 aptitude columns
  .concat(["R","I","A","S","E","C"]) // RIASEC
  .concat(["SOI 1","SOI 2","SOI 3","SOI 4","SOI 5"])
  .concat(["Value 1","Value 2","Value 3","Value 4","Value 5"])
  .concat([
    "Career Aspiration 1",
    "Career Aspiration 2",
    "Career Aspiration 3",
    "Career Aspiration 4",
    "Career Aspiration 5"           // formerly Unnamed: 43
  ]);

  output.push(masterHeader);

  // ===== MAIN ROW LOOP =====
  for (var r = 0; r < dataRows.length; r++) {
    var row = dataRows[r];

    // Skip completely empty rows (no roll number)
    var roll = row[idx("Roll Number")];
    if (roll === "" || roll === null) {
      continue;
    }

    var school = row[idx("School")];
    var section = row[idx("Section")];
    var name = row[idx("Name")];
    var clazz = row[idx("Class")];

    // ---------- Section F: Multiple Intelligence ----------
    // Sec_F_1..Sec_F_24, groups of 3, weights F_WEIGHTS
    var miScores = [0,0,0,0,0,0,0,0]; // same order as MI_LABELS

    for (var q = 1; q <= 24; q++) {
      var colNameF = "Sec_F_" + q;
      var cIdxF = idx(colNameF);
      var ansF = norm(row[cIdxF]);
      var wF = F_WEIGHTS[ansF] || 0;
      var groupIndex = Math.floor((q - 1) / 3); // 0..7
      miScores[groupIndex] += wF;
    }

    // ---------- Section E: Aptitude ----------
    var aptScores = {};
    // Initialize
    APT_LABELS.forEach(function(label) {
      aptScores[label] = 0;
    });

    for (var label in E_GROUPS) {
      var indices = E_GROUPS[label]; // [q1,q2,q3]
      var sum = 0;
      for (var k = 0; k < indices.length; k++) {
        var qE = indices[k];
        var colNameE = "Sec_E_" + qE;
        var cIdxE = idx(colNameE);
        var ansE = norm(row[cIdxE]);
        var wE = E_WEIGHTS[ansE] || 0;
        sum += wE;
      }
      aptScores[label] = sum;
    }

    // ---------- Section D: RIASEC ----------
    var riaSecScores = {
      "R": 0,
      "I": 0,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 0
    };

    for (var d = 1; d <= 54; d++) {
      var colNameD = "Sec_D_" + d;
      var cIdxD = idx(colNameD);
      var ansD = norm(row[cIdxD]);
      var wD = 0;
      if (ansD === "YES") wD = 2;
      else if (ansD === "NO") wD = 1;
      // anything else => 0

      var riIndex = (d - 1) % 6; // 0..5
      var letter = RIASEC_LETTERS[riIndex];
      riaSecScores[letter] += wD;
    }

    // ---------- Section C: SOI top 5 ----------
    var soiList = [];
    for (var c = 1; c <= 15; c++) {
      var colNameC = "Sec_C_" + c;
      var cIdxC = idx(colNameC);
      if (isSelected(row[cIdxC])) {
        soiList.push(SOI_LABELS[c - 1]);
      }
    }
    // Pad to 5
    while (soiList.length < 5) soiList.push("");

    // ---------- Section B: Work Values top 5 ----------
    var valList = [];
    for (var b = 1; b <= 15; b++) {
      var colNameB = "Sec_B_" + b;
      var cIdxB = idx(colNameB);
      if (isSelected(row[cIdxB])) {
        valList.push(VALUE_LABELS[b - 1]);
      }
    }
    // Pad to 5
    while (valList.length < 5) valList.push("");

    // ---------- Section A: Career Aspirations top 5 ----------
    var careerList = [];
    for (var a = 1; a <= 24; a++) {
      var colNameA = "Sec_A_" + a;
      var cIdxA = idx(colNameA);
      if (isSelected(row[cIdxA])) {
        careerList.push(CAREER_LABELS[a - 1]);
      }
    }
    while (careerList.length < 5) careerList.push("");

    // ---------- Assemble Master row ----------
    var outRow = [];

    // Basic
    outRow.push(school, section, roll, name, clazz);

    // MI scores in MI_LABELS order
    for (var i = 0; i < MI_LABELS.length; i++) {
      outRow.push(miScores[i]);
    }

    // Aptitude in APT_LABELS order
    for (var j = 0; j < APT_LABELS.length; j++) {
      outRow.push(aptScores[APT_LABELS[j]]);
    }

    // RIASEC R,I,A,S,E,C
    outRow.push(
      riaSecScores["R"],
      riaSecScores["I"],
      riaSecScores["A"],
      riaSecScores["S"],
      riaSecScores["E"],
      riaSecScores["C"]
    );

    // SOI 1..5
    outRow = outRow.concat(soiList.slice(0, 5));

    // Value 1..5
    outRow = outRow.concat(valList.slice(0, 5));

    // Career Aspiration 1..5
    outRow = outRow.concat(careerList.slice(0, 5));

    output.push(outRow);
  }

  // Delete old Master Sheet if exists
  var oldMaster = ss.getSheetByName('Master Sheet');
  if (oldMaster) {
    ss.deleteSheet(oldMaster);
  }

  var masterSheet = ss.insertSheet('Master Sheet');
  masterSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
}
