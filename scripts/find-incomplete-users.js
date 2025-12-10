const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const firestore = getFirestore();

async function findIncompleteUsers() {
  try {
    console.log('Finding incomplete user documents...\n');
    
    const usersSnapshot = await firestore.collection('users').get();
    const incompleteUsers = [];
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const hasName = data.personal?.name;
      const hasStudentClass = data.educational?.studentClass;
      
      if (!hasName || !hasStudentClass) {
        incompleteUsers.push({
          uid: doc.id,
          email: data.personal?.email || 'No email',
          name: hasName ? data.personal.name : 'MISSING',
          studentClass: hasStudentClass ? data.educational.studentClass : 'MISSING',
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || 'Unknown',
        });
      }
    }
    
    console.log(`Total Firestore users: ${usersSnapshot.size}`);
    console.log(`Users with valid data (name + studentClass): ${usersSnapshot.size - incompleteUsers.length}`);
    console.log(`Incomplete users: ${incompleteUsers.length}\n`);
    
    if (incompleteUsers.length > 0) {
      console.log('Incomplete user documents:');
      console.log('='.repeat(80));
      incompleteUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Student Class: ${user.studentClass}`);
        console.log(`   Created: ${user.createdAt}`);
      });
    } else {
      console.log('✅ All users have complete data!');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findIncompleteUsers()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });







