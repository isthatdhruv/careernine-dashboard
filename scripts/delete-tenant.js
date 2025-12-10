const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const readline = require('readline');

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listTenants() {
  try {
    const tenantsSnapshot = await db.collection('tenants').get();
    const tenants = [];
    
    tenantsSnapshot.forEach((doc) => {
      const tenant = doc.data();
      tenants.push({
        id: doc.id,
        subdomain: tenant.subdomain,
        name: tenant.name || 'N/A',
        createdAt: tenant.createdAt?.toDate() || new Date()
      });
    });
    
    return tenants.sort((a, b) => a.subdomain.localeCompare(b.subdomain));
  } catch (error) {
    console.error('Error listing tenants:', error);
    throw error;
  }
}

async function getUsersCountForTenant(subdomain) {
  try {
    const usersSnapshot = await db.collection('users')
      .where('tenant', '==', subdomain)
      .get();
    return usersSnapshot.size;
  } catch (error) {
    console.error('Error counting users:', error);
    return 0;
  }
}

async function reassignUsersToTenant(fromTenant, toTenant) {
  try {
    const usersSnapshot = await db.collection('users')
      .where('tenant', '==', fromTenant)
      .get();
    
    if (usersSnapshot.empty) {
      return 0;
    }
    
    const batch = db.batch();
    let count = 0;
    
    usersSnapshot.forEach((doc) => {
      batch.update(doc.ref, { tenant: toTenant });
      count++;
    });
    
    await batch.commit();
    return count;
  } catch (error) {
    console.error('Error reassigning users:', error);
    throw error;
  }
}

async function deleteTenant(subdomain, reassignTo = null) {
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

    const tenant = tenantDoc.data();
    
    // Check for associated users
    const userCount = await getUsersCountForTenant(subdomain);
    
    if (userCount > 0) {
      if (reassignTo) {
        console.log(`\n⚠️  Warning: Found ${userCount} user(s) associated with tenant '${subdomain}'`);
        console.log(`Reassigning users to tenant '${reassignTo}'...`);
        const reassigned = await reassignUsersToTenant(subdomain, reassignTo);
        console.log(`✓ Reassigned ${reassigned} user(s) to tenant '${reassignTo}'`);
      } else {
        console.log(`\n⚠️  Warning: Found ${userCount} user(s) associated with tenant '${subdomain}'`);
        console.log('These users will still reference this tenant after deletion.');
        console.log('Consider reassigning them first using the --reassign option.');
      }
    }

    // Delete tenant
    await tenantRef.delete();
    console.log(`\n✓ Tenant '${subdomain}' (${tenant.name || 'N/A'}) deleted successfully!`);
    
    return true;
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
}

async function interactiveDelete() {
  try {
    console.log('\nFetching tenants...\n');
    const tenants = await listTenants();
    
    if (tenants.length === 0) {
      console.log('No tenants found.');
      rl.close();
      return;
    }
    
    console.log('Available tenants:');
    console.log('==================\n');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.subdomain} - ${tenant.name} (Created: ${tenant.createdAt.toLocaleDateString()})`);
    });
    
    const answer = await question('\nEnter the number of the tenant to delete (or subdomain): ');
    
    let selectedTenant = null;
    const numAnswer = parseInt(answer);
    
    if (!isNaN(numAnswer) && numAnswer >= 1 && numAnswer <= tenants.length) {
      selectedTenant = tenants[numAnswer - 1];
    } else {
      // Try to find by subdomain
      selectedTenant = tenants.find(t => t.subdomain === answer.trim());
      if (!selectedTenant) {
        console.log('Invalid selection.');
        rl.close();
        return;
      }
    }
    
    console.log(`\nSelected tenant: ${selectedTenant.subdomain} - ${selectedTenant.name}`);
    
    // Check for users
    const userCount = await getUsersCountForTenant(selectedTenant.subdomain);
    if (userCount > 0) {
      console.log(`\n⚠️  Warning: This tenant has ${userCount} associated user(s).`);
      const reassign = await question('Reassign users to another tenant? Enter subdomain (or press Enter to skip): ');
      
      if (reassign.trim()) {
        // Verify target tenant exists
        const targetTenant = await db.collection('tenants').doc(reassign.trim()).get();
        if (!targetTenant.exists) {
          console.log(`Error: Target tenant '${reassign.trim()}' does not exist.`);
          rl.close();
          return;
        }
        
        const confirm = await question(`\nDelete tenant '${selectedTenant.subdomain}' and reassign ${userCount} user(s) to '${reassign.trim()}'? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
          await deleteTenant(selectedTenant.subdomain, reassign.trim());
        } else {
          console.log('Deletion cancelled.');
        }
      } else {
        const confirm = await question(`\nDelete tenant '${selectedTenant.subdomain}' anyway? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
          await deleteTenant(selectedTenant.subdomain);
        } else {
          console.log('Deletion cancelled.');
        }
      }
    } else {
      const confirm = await question(`\nDelete tenant '${selectedTenant.subdomain}'? (yes/no): `);
      if (confirm.toLowerCase() === 'yes') {
        await deleteTenant(selectedTenant.subdomain);
      } else {
        console.log('Deletion cancelled.');
      }
    }
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage:');
    console.log('  Interactive mode:');
    console.log('    node scripts/delete-tenant.js');
    console.log('\n  Direct deletion:');
    console.log('    node scripts/delete-tenant.js <subdomain>');
    console.log('\n  With user reassignment:');
    console.log('    node scripts/delete-tenant.js <subdomain> --reassign <target-tenant>');
    console.log('\nExamples:');
    console.log('    node scripts/delete-tenant.js');
    console.log('    node scripts/delete-tenant.js mytenant');
    console.log('    node scripts/delete-tenant.js old-tenant --reassign default');
    process.exit(0);
  }
  
  const subdomain = args[0];
  const reassignIndex = args.indexOf('--reassign');
  const reassignTo = reassignIndex !== -1 && args[reassignIndex + 1] ? args[reassignIndex + 1] : null;
  
  if (!subdomain) {
    // Interactive mode
    interactiveDelete();
  } else {
    // Direct deletion mode - need confirmation
    (async () => {
      try {
        // Check if tenant exists and get info
        const tenantRef = db.collection('tenants').doc(subdomain);
        const tenantDoc = await tenantRef.get();
        
        if (!tenantDoc.exists) {
          console.error(`Error: Tenant with subdomain '${subdomain}' does not exist.`);
          process.exit(1);
        }
        
        const tenant = tenantDoc.data();
        const userCount = await getUsersCountForTenant(subdomain);
        
        console.log(`\nTenant: ${subdomain} - ${tenant.name || 'N/A'}`);
        if (userCount > 0) {
          console.log(`⚠️  Warning: This tenant has ${userCount} associated user(s).`);
          if (reassignTo) {
            // Verify target tenant exists
            const targetTenant = await db.collection('tenants').doc(reassignTo).get();
            if (!targetTenant.exists) {
              console.error(`Error: Target tenant '${reassignTo}' does not exist.`);
              process.exit(1);
            }
            console.log(`Users will be reassigned to: ${reassignTo}`);
          } else {
            console.log('Users will NOT be reassigned. Consider using --reassign option.');
          }
        }
        
        const confirm = await question(`\nDelete tenant '${subdomain}'? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
          await deleteTenant(subdomain, reassignTo);
          console.log('\nDone.');
          rl.close();
          process.exit(0);
        } else {
          console.log('Deletion cancelled.');
          rl.close();
          process.exit(0);
        }
      } catch (error) {
        console.error(error);
        rl.close();
        process.exit(1);
      }
    })();
  }
}

module.exports = { deleteTenant, listTenants };

