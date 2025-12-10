import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Get selected UIDs from query parameter (comma-separated)
    const searchParams = request.nextUrl.searchParams;
    const selectedUidsParam = searchParams.get('uids');
    const selectedUids = selectedUidsParam ? selectedUidsParam.split(',').filter(Boolean) : null;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    let allDocs = snapshot.docs;
    
    // Filter by selected UIDs if provided
    if (selectedUids && selectedUids.length > 0) {
      const uidSet = new Set(selectedUids);
      allDocs = allDocs.filter(doc => uidSet.has(doc.id));
    }

    const workbook = XLSX.utils.book_new();

    // Helper function to get student identification data with all required columns
    // Order: UID, Name, Class, Section, School, DOB, Email, Joined Date, Tenant, Status
    const getStudentInfo = (doc: any) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const authCreatedAt = data.authCreatedAt ? new Date(data.authCreatedAt) : null;
      
      // Return in the exact order requested
      const studentInfo: any = {};
      studentInfo['UID'] = doc.id;
      studentInfo['Name'] = data.personal?.name || '';
      studentInfo['Class'] = data.educational?.studentClass || '';
      studentInfo['Section'] = data.educational?.section || '';
      studentInfo['School'] = data.educational?.school || '';
      studentInfo['DOB'] = data.personal?.dob || '';
      studentInfo['Email'] = data.personal?.email || '';
      studentInfo['Joined Date'] = (authCreatedAt || createdAt).toLocaleDateString() || '';
      studentInfo['Tenant'] = data.tenant || '';
      studentInfo['Status'] = getAssessmentStatus(data);
      
      return studentInfo;
    };

    // Helper function to determine assessment status
    const getAssessmentStatus = (data: any) => {
      const cardsStatus = data.cardsStatus || {};
      const completedQuizzes = Object.values(cardsStatus).filter(Boolean).length;
      const studentClass = Number(data.educational?.studentClass || 0);
      const requiredQuizzes = studentClass >= 9 ? 6 : 5;
      
      const adjustedCompletedQuizzes = studentClass < 9 && cardsStatus?.careerAspirations 
        ? completedQuizzes - 1 
        : completedQuizzes;
      
      if (adjustedCompletedQuizzes === requiredQuizzes) return 'Completed';
      if (adjustedCompletedQuizzes > 0) return 'In Progress';
      return 'Not Started';
    };

    // 1. Ability Assessment Sheet
    const abilityRows: any[] = [];
    let abilityQuestionLabels: string[] = [];

    // Find a student with complete ability responses to get question labels
    for (const doc of allDocs) {
      const responses = doc.data().abilityDetailedResponses || [];
      if (responses.length >= 30) {
        abilityQuestionLabels = responses.map((r: any, i: number) => 
          `Q${i + 1}: ${r.question || ''}`
        );
        break;
      }
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const responses = data.abilityDetailedResponses || [];
      
      if (responses.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add question responses
        for (let i = 0; i < Math.max(abilityQuestionLabels.length, responses.length); i++) {
          const label = abilityQuestionLabels[i] || `Q${i + 1}`;
          row[label] = responses[i]?.points ?? '';
        }

        abilityRows.push(row);
      }
    }

    if (abilityRows.length > 0) {
      const abilitySheet = XLSX.utils.json_to_sheet(abilityRows);
      XLSX.utils.book_append_sheet(workbook, abilitySheet, 'Ability');
    }

    // 2. Personality Assessment Sheet
    const personalityRows: any[] = [];
    let personalityQuestionLabels: string[] = [];

    // Find a student with complete personality responses
    for (const doc of allDocs) {
      const responses = doc.data().personalityDetailedResponses || [];
      if (responses.length >= 54) {
        personalityQuestionLabels = responses.map((r: any, i: number) => 
          `Q${i + 1}: ${r.question || ''}`
        );
        break;
      }
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const responses = data.personalityDetailedResponses || [];
      
      if (responses.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add question responses
        for (let i = 0; i < Math.max(personalityQuestionLabels.length, responses.length); i++) {
          const label = personalityQuestionLabels[i] || `Q${i + 1}`;
          row[label] = responses[i]?.points ?? '';
        }

        personalityRows.push(row);
      }
    }

    if (personalityRows.length > 0) {
      const personalitySheet = XLSX.utils.json_to_sheet(personalityRows);
      XLSX.utils.book_append_sheet(workbook, personalitySheet, 'Personality');
    }

    // 3. Multiple Intelligence Assessment Sheet
    const multipleIntelligenceRows: any[] = [];
    let multipleIntelligenceQuestionLabels: string[] = [];

    // Find a student with complete multiple intelligence responses
    for (const doc of allDocs) {
      const responses = doc.data().multipleIntelligenceResponses || [];
      if (responses.length >= 21) {
        multipleIntelligenceQuestionLabels = responses.map((r: any, i: number) => 
          `Q${i + 1}: ${r.question || ''}`
        );
        break;
      }
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const responses = data.multipleIntelligenceResponses || [];
      
      if (responses.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add question responses
        for (let i = 0; i < Math.max(multipleIntelligenceQuestionLabels.length, responses.length); i++) {
          const label = multipleIntelligenceQuestionLabels[i] || `Q${i + 1}`;
          row[label] = responses[i]?.points ?? '';
        }

        multipleIntelligenceRows.push(row);
      }
    }

    if (multipleIntelligenceRows.length > 0) {
      const multipleIntelligenceSheet = XLSX.utils.json_to_sheet(multipleIntelligenceRows);
      XLSX.utils.book_append_sheet(workbook, multipleIntelligenceSheet, 'Multiple Intelligence');
    }

    // 4. Subjects of Interest Sheet
    const subjectsOfInterestRows: any[] = [];
    let maxSubjects = 0;

    // Find maximum number of subjects
    for (const doc of allDocs) {
      const subjects = doc.data().subjectsOfInterest || [];
      maxSubjects = Math.max(maxSubjects, subjects.length);
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const subjects = data.subjectsOfInterest || [];
      
      if (subjects.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add subject responses
        for (let i = 0; i < maxSubjects; i++) {
          row[`Subject ${i + 1}`] = subjects[i] || '';
        }

        subjectsOfInterestRows.push(row);
      }
    }

    if (subjectsOfInterestRows.length > 0) {
      const subjectsSheet = XLSX.utils.json_to_sheet(subjectsOfInterestRows);
      XLSX.utils.book_append_sheet(workbook, subjectsSheet, 'Subjects of Interest');
    }

    // 5. Values Sheet
    const valuesRows: any[] = [];
    let maxValues = 0;

    // Find maximum number of values
    for (const doc of allDocs) {
      const values = doc.data().values || [];
      maxValues = Math.max(maxValues, values.length);
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const values = data.values || [];
      
      if (values.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add value responses
        for (let i = 0; i < maxValues; i++) {
          row[`Value ${i + 1}`] = values[i] || '';
        }

        valuesRows.push(row);
      }
    }

    if (valuesRows.length > 0) {
      const valuesSheet = XLSX.utils.json_to_sheet(valuesRows);
      XLSX.utils.book_append_sheet(workbook, valuesSheet, 'Values');
    }

    // 6. Career Aspirations Sheet
    const careerAspirationsRows: any[] = [];
    let maxCareerAspirations = 0;

    // Find maximum number of career aspirations
    for (const doc of allDocs) {
      const careerAspirations = doc.data().careerAspirations || [];
      maxCareerAspirations = Math.max(maxCareerAspirations, careerAspirations.length);
    }

    for (const doc of allDocs) {
      const data = doc.data();
      const careerAspirations = data.careerAspirations || [];
      
      if (careerAspirations.length > 0) {
        const row: any = {
          ...getStudentInfo(doc),
        };

        // Add career aspiration responses
        for (let i = 0; i < maxCareerAspirations; i++) {
          row[`Career Aspiration ${i + 1}`] = careerAspirations[i] || '';
        }

        careerAspirationsRows.push(row);
      }
    }

    if (careerAspirationsRows.length > 0) {
      const careerAspirationsSheet = XLSX.utils.json_to_sheet(careerAspirationsRows);
      XLSX.utils.book_append_sheet(workbook, careerAspirationsSheet, 'Career Aspirations');
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `detailed_assessment_responses_${date}.xlsx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('❌ Detailed Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export detailed Excel' },
      { status: 500 }
    );
  }
}

