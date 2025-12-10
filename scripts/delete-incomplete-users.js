const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
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

const auth = getAuth();
const firestore = getFirestore();

async function deleteIncompleteUsers() {
  try {
    console.log('Finding and deleting incomplete user documents...\n');
    
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
        });
      }
    }
    
    console.log(`Found ${incompleteUsers.length} incomplete user(s):\n`);
    incompleteUsers.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Student Class: ${user.studentClass}\n`);
    });
    
    if (incompleteUsers.length === 0) {
      console.log('✅ No incomplete users found!');
      process.exit(0);
    }
    
    console.log('Deleting users...\n');
    
    for (const user of incompleteUsers) {
      try {
        // Delete from Firestore
        await firestore.collection('users').doc(user.uid).delete();
        console.log(`✅ Deleted Firestore document for ${user.uid}`);
        
        // Try to delete from Auth (may not exist)
        try {
          await auth.deleteUser(user.uid);
          console.log(`✅ Deleted Auth user for ${user.uid}`);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`⚠️  Auth user not found for ${user.uid} (Firestore doc deleted)`);
          } else {
            throw authError;
          }
        }
      } catch (error) {
        console.error(`❌ Error deleting ${user.uid}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully deleted ${incompleteUsers.length} incomplete user(s)!`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteIncompleteUsers()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });







