const admin = require('firebase-admin');
const fs = require('fs');
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

const auth = admin.auth();
const db = admin.firestore();

// List of UIDs to delete
const uidsToDelete = [
  'ob4aknqNqlSq17X43u5wStjpWkM2',
  'PlpiPlX64dcRtXg8fiZOWlZb40s1',
];

async function deleteUsersAndUpdateTenants() {
  // Delete users from Auth and Firestore
  for (const uid of uidsToDelete) {
    try {
      await auth.deleteUser(uid);
      console.log(`Deleted user from Auth: ${uid}`);
    } catch (err) {
      console.error(`Failed to delete user from Auth ${uid}:`, err.message);
    }
    try {
      await db.collection('users').doc(uid).delete();
      console.log(`Deleted user from Firestore: ${uid}`);
    } catch (err) {
      console.error(`Failed to delete user from Firestore ${uid}:`, err.message);
    }
  }

  // Set all users' tenant to 'default' in Firestore
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  const batch = db.batch();
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { tenant: 'default' });
  });
  await batch.commit();
  console.log('Set tenant to default for all users.');
}

deleteUsersAndUpdateTenants().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 