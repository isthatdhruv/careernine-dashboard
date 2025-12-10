const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin using environment variables
initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

async function initializeAppointments() {
  try {
    // Get all users who don't have a counselingAppointment field
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      // Only update if user doesn't have counselingAppointment field or it's incomplete
      if (!userData.counselingAppointment || 
          userData.counselingAppointment === undefined ||
          userData.counselingAppointment.appointmentURI === undefined) {
        
        batch.update(doc.ref, {
          'counselingAppointment': {
            appointmentURI: null,
            scheduledAt: null,
            inviteeURI: null,
            status: 'not_scheduled'
          }
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Updated ${count} users with default counselingAppointment fields.`);
    } else {
      console.log('No users needed updating.');
    }
  } catch (error) {
    console.error('Error initializing appointments:', error);
  }
}

initializeAppointments()
  .then(() => console.log('Initialization complete.'))
  .catch(err => console.error('Initialization failed:', err)); 