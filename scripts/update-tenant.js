const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateTenantConfig() {
  try {
    const aspireConfig = {
      id: 'aspire',
      name: 'Aspire',
      subdomain: 'aspire',
      title: 'Aspire Career Navigator',
      features: {
        enablePayments: false,
        enableCalendly: false,
      },
      settings: {
        supportEmail: 'support@aspire.com',
      },
    };

    await db.collection('tenants').doc('aspire').set(aspireConfig);
    console.log('Successfully updated Aspire tenant configuration');
  } catch (error) {
    console.error('Error updating tenant configuration:', error);
  }
}

updateTenantConfig(); 