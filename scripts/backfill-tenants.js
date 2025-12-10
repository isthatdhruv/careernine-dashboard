require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

console.log('Loaded env:', {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '***' : undefined,
});

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

console.log('Initializing Firebase Admin with config:', { ...firebaseConfig, privateKey: '***' });

initializeApp({
  credential: cert(firebaseConfig),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const db = getFirestore();

(async () => {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  let updated = 0;
  let total = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    total++;
    await doc.ref.update({ tenant: 'Career-9' });
    updated++;
    console.log(`Updated user ${doc.id} with tenant: Career-9`);
  }
  console.log(`Total users: ${total}, Updated: ${updated}`);
})(); 