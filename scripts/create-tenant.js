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

async function createTenant(subdomain, config) {
  try {
    // Validate subdomain
    if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
      throw new Error('Invalid subdomain. Use only lowercase letters, numbers, and hyphens.');
    }

    // Check if tenant already exists
    const existingTenant = await db.collection('tenants').doc(subdomain).get();
    if (existingTenant.exists) {
      throw new Error(`Tenant with subdomain '${subdomain}' already exists.`);
    }

    // Create tenant configuration
    const tenantConfig = {
      id: subdomain,
      name: config.name || 'Career Navigator 360',
      subdomain,
      features: {
        enablePayments: config.enablePayments ?? false,
        enableCalendly: config.enableCalendly ?? false,
      },
      settings: {
        supportEmail: config.supportEmail || 'support@career-9.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add calendlyUrl only if it's provided
    if (config.calendlyUrl) {
      tenantConfig.settings.calendlyUrl = config.calendlyUrl;
    }

    // Add adminPassword if provided
    if (config.adminPassword) {
      tenantConfig.settings.adminPassword = config.adminPassword;
    }

    // Save tenant configuration
    await db.collection('tenants').doc(subdomain).set(tenantConfig);
    console.log(`Tenant '${subdomain}' created successfully!`);
    
    if (config.adminPassword) {
      console.log(`Admin password set for tenant '${subdomain}'!`);
    }
    
    return tenantConfig;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const subdomain = args[0];
  
  if (!subdomain) {
    console.error('Please provide a subdomain');
    process.exit(1);
  }

  const config = {
    name: args[1] || 'Career Navigator 360',
    enablePayments: args[2] === 'true',
    enableCalendly: args[3] === 'true',
    calendlyUrl: args[4],
    supportEmail: args[5] || 'support@career-9.com',
    adminPassword: args[6], // Optional password
  };

  createTenant(subdomain, config)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createTenant }; 