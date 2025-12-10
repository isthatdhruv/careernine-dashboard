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

// Sample user data from pk10@pk.com (the new format)
const sampleUserData = {
  personal: {
    name: 'User Name',
    email: 'user@example.com',
    phone: '1234567890',
    countryCode: '+91',
    dob: '01/01/2000',
    gender: 'Male',
  },
  educational: {
    school: 'School Name',
    schoolType: 'CBSE',
    studentClass: '10',
    fatherOccupation: '',
    motherOccupation: '',
    topHighScoringSubjects: '',
    activities: '',
    awards: '',
    hobbies: '',
  },
  payment: {
    selectedPlan: 'assessment',
    paymentStatus: 'paid',
    amount: 99900,
    razorpay_payment_id: '',
    razorpay_order_id: '',
    razorpay_signature: '',
  },
  cardsStatus: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  counselingAppointment: {
    appointmentURI: null,
    scheduledAt: null,
    inviteeURI: null,
    status: null
  }
};

async function standardizeUserData() {
  try {
    console.log('Starting user data standardization...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.docs.length} users`);
    
    let updatedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      let needsUpdate = false;
      let updatedData = { ...userData };
      
      // Check and add personal section if missing
      if (!userData.personal) {
        console.log(`User ${userDoc.id} missing personal section`);
        needsUpdate = true;
        updatedData.personal = {
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          countryCode: userData.countryCode || '+91',
          dob: userData.dob || '',
          gender: userData.gender || '',
        };
      }
      
      // Check and add educational section if missing
      if (!userData.educational) {
        console.log(`User ${userDoc.id} missing educational section`);
        needsUpdate = true;
        updatedData.educational = {
          school: userData.school || '',
          schoolType: userData.schoolType || '',
          studentClass: userData.studentClass || '',
          fatherOccupation: userData.fatherOccupation || '',
          motherOccupation: userData.motherOccupation || '',
          topHighScoringSubjects: userData.topHighScoringSubjects || '',
          activities: userData.activities || '',
          awards: userData.awards || '',
          hobbies: userData.hobbies || '',
        };
      }
      
      // Check and add payment section if missing
      if (!userData.payment) {
        console.log(`User ${userDoc.id} missing payment section`);
        needsUpdate = true;
        updatedData.payment = {
          selectedPlan: userData.selectedPlan || 'assessment',
          paymentStatus: userData.paymentStatus || 'paid',
          amount: userData.amount || 99900,
          razorpay_payment_id: userData.razorpay_payment_id || '',
          razorpay_order_id: userData.razorpay_order_id || '',
          razorpay_signature: userData.razorpay_signature || '',
        };
      }
      
      // Check and add cardsStatus if missing
      if (!userData.cardsStatus) {
        console.log(`User ${userDoc.id} missing cardsStatus section`);
        needsUpdate = true;
        updatedData.cardsStatus = {};
      }
      
      // Check and add counselingAppointment if missing
      if (!userData.counselingAppointment) {
        console.log(`User ${userDoc.id} missing counselingAppointment section`);
        needsUpdate = true;
        updatedData.counselingAppointment = {
          appointmentURI: null,
          scheduledAt: null,
          inviteeURI: null,
          status: null
        };
      }
      
      // Check and add dates if missing
      if (!userData.createdAt) {
        console.log(`User ${userDoc.id} missing createdAt`);
        needsUpdate = true;
        updatedData.createdAt = new Date();
      }
      
      if (!userData.updatedAt) {
        console.log(`User ${userDoc.id} missing updatedAt`);
        needsUpdate = true;
        updatedData.updatedAt = new Date();
      }
      
      // Update the user document if needed
      if (needsUpdate) {
        await db.collection('users').doc(userDoc.id).update(updatedData);
        console.log(`Updated user ${userDoc.id}`);
        updatedCount++;
      }
    }
    
    console.log(`Standardization complete. Updated ${updatedCount} users.`);
    
  } catch (error) {
    console.error('Error standardizing user data:', error);
  }
}

standardizeUserData()
  .then(() => console.log('User data standardization script completed'))
  .catch(err => console.error('User data standardization script failed:', err)); 