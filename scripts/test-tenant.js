const { createTenant } = require('./create-tenant');

async function setupTestTenants() {
  try {
    // Create Aspire tenant
    await createTenant('aspire', {
      name: 'Aspire Career Navigator',
      enablePayments: false,
      enableCalendly: false,
      supportEmail: 'support@career-9.com'
    });

    // Create default tenant (if not exists)
    await createTenant('default', {
      name: 'Career Navigator 360',
      enablePayments: true,
      enableCalendly: true,
      calendlyUrl: 'https://calendly.com/prasad-khake-career-9/30min',
      supportEmail: 'support@career-9.com'
    });

    console.log('Test tenants created successfully!');
    console.log('\nYou can now test the application using:');
    console.log('1. Default tenant: http://localhost:3000');
    console.log('2. Aspire tenant: http://aspire.career-9.com:3000');
  } catch (error) {
    console.error('Error setting up test tenants:', error);
  }
}

setupTestTenants(); 