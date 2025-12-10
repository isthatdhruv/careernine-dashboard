import { db } from '../app/lib/firebase-admin';

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