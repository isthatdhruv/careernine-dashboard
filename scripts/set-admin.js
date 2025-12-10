const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setAdminUser() {
  try {
    // Set admin user
    await setDoc(doc(db, 'users', 'pk@career-9.com'), {
      email: 'pk@career-9.com',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    console.log('Admin user set successfully!');
  } catch (error) {
    console.error('Error setting admin user:', error);
  }
}

setAdminUser(); 