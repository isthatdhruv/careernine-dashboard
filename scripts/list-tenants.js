const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

async function listTenants() {
  try {
    const tenantsSnapshot = await db.collection('tenants').get();
    
    console.log('All tenants:');
    console.log('============');
    
    tenantsSnapshot.forEach((doc) => {
      const tenant = doc.data();
      console.log(`ID: ${tenant.id}`);
      console.log(`Name: ${tenant.name}`);
      console.log(`Subdomain: ${tenant.subdomain}`);
      console.log(`Payments: ${tenant.features.enablePayments}`);
      console.log(`Calendly: ${tenant.features.enableCalendly}`);
      console.log(`Created: ${tenant.createdAt.toDate()}`);
      console.log('---');
    });
    
    console.log(`Total tenants: ${tenantsSnapshot.size}`);
  } catch (error) {
    console.error('Error listing tenants:', error);
  }
}

listTenants()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 