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

async function setTenantPassword(subdomain, password) {
  try {
    // Validate subdomain
    if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
      throw new Error('Invalid subdomain. Use only lowercase letters, numbers, and hyphens.');
    }

    // Check if tenant exists
    const tenantRef = db.collection('tenants').doc(subdomain);
    const tenantDoc = await tenantRef.get();
    
    if (!tenantDoc.exists) {
      throw new Error(`Tenant with subdomain '${subdomain}' does not exist.`);
    }

    // Update tenant configuration with admin password
    await tenantRef.update({
      'settings.adminPassword': password,
      updatedAt: new Date(),
    });

    console.log(`Admin password set successfully for tenant '${subdomain}'!`);
    return true;
  } catch (error) {
    console.error('Error setting tenant password:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const subdomain = args[0];
  const password = args[1];
  
  if (!subdomain || !password) {
    console.error('Usage: node scripts/set-tenant-password.js <subdomain> <password>');
    console.error('Example: node scripts/set-tenant-password.js mytenant MySecurePassword123');
    process.exit(1);
  }

  setTenantPassword(subdomain, password)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setTenantPassword };

