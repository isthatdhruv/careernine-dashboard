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

async function checkSettings() {
  try {
    console.log('Checking Firestore settings...');
    
    // Check pricing settings
    const pricingDoc = await db.collection('settings').doc('pricing').get();
    if (pricingDoc.exists) {
      console.log('Pricing settings:', pricingDoc.data());
    } else {
      console.log('No pricing settings found');
    }
    
    // Check plan details
    const plansDoc = await db.collection('settings').doc('plans').get();
    if (plansDoc.exists) {
      const plansData = plansDoc.data();
      console.log('Plans settings:');
      console.log('- Assessment plan:', plansData.assessment);
      console.log('- Counselling plan:', plansData.counselling);
      
      if (plansData.upgrades && plansData.upgrades['assessment-to-counselling']) {
        console.log('- Upgrade plan:', plansData.upgrades['assessment-to-counselling']);
      } else {
        console.log('No upgrade plan found in plans settings');
      }
    } else {
      console.log('No plans settings found');
    }
    
    // Check app config
    const configDoc = await db.collection('settings').doc('config').get();
    if (configDoc.exists) {
      console.log('App configuration:', configDoc.data());
    } else {
      console.log('No app configuration found');
    }
    
  } catch (error) {
    console.error('Error checking settings:', error);
  }
}

checkSettings()
  .then(() => console.log('Settings check complete'))
  .catch(err => console.error('Settings check failed:', err)); 