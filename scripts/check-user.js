const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// User ID to check
const userId = process.argv[2] || '3Mc6zIT8xgZzwXckOZpV7fsIe7k1';

async function checkUser() {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      console.log(`✅ User document exists for ID: ${userId}`);
      console.log('\nDocument data:');
      console.log(JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log(`❌ User document does NOT exist for ID: ${userId}`);
      console.log('\nThis could mean:');
      console.log('1. The document was never created (registration failed)');
      console.log('2. The document was deleted');
      console.log('3. You are checking a different Firebase project');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  }
  
  process.exit(0);
}

checkUser();

