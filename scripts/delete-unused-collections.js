const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const firestore = getFirestore();

// Collections that ARE used in the codebase
const USED_COLLECTIONS = [
  'users',           // Main user data
  'coupons',          // Coupon codes
  'settings',         // App settings (pricing, plans, config)
  'tenants',          // Tenant configurations
  'payments',         // Payment records (created on-the-fly, may not exist yet)
];

// Collections to check and potentially delete
const COLLECTIONS_TO_CHECK = [
  'assessments',
  'career-aspirations',
  'classGroups',
  'domains',
  'lms',
  'options',
  'personalityDomains',
  'questions',
  'subjects-of-interest',
  'values',
];

// Check for --yes flag to skip confirmation
const AUTO_CONFIRM = process.argv.includes('--yes') || process.argv.includes('-y');

let rl = null;
if (!AUTO_CONFIRM) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(query) {
  if (AUTO_CONFIRM) {
    console.log(query + 'yes (auto-confirmed)');
    return Promise.resolve('yes');
  }
  return new Promise(resolve => rl.question(query, resolve));
}

async function deleteCollection(collectionId) {
  const collectionRef = firestore.collection(collectionId);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  Collection "${collectionId}" is already empty.`);
    return { deleted: 0, errors: 0 };
  }
  
  const batch = firestore.batch();
  let count = 0;
  let batchCount = 0;
  const maxBatchSize = 500; // Firestore batch limit
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    batchCount++;
    
    if (batchCount >= maxBatchSize) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return { deleted: count, errors: 0 };
}

async function main() {
  try {
    console.log('Checking Firestore collections...\n');
    
    // Get all collections
    const allCollections = await firestore.listCollections();
    const collectionIds = allCollections.map(col => col.id);
    
    console.log('Collections found in Firestore:');
    allCollections.forEach(col => {
      const isUsed = USED_COLLECTIONS.includes(col.id);
      console.log(`  ${col.id} ${isUsed ? '✓ (USED)' : '✗ (UNUSED)'}`);
    });
    
    // Find unused collections
    const unusedCollections = collectionIds.filter(
      id => !USED_COLLECTIONS.includes(id)
    );
    
    if (unusedCollections.length === 0) {
      console.log('\n✅ No unused collections found. All collections are in use.');
      process.exit(0);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('UNUSED COLLECTIONS DETECTED:');
    console.log('='.repeat(80));
    
    // Get document counts for unused collections
    const collectionDetails = [];
    for (const collectionId of unusedCollections) {
      const collectionRef = firestore.collection(collectionId);
      const snapshot = await collectionRef.get();
      collectionDetails.push({
        id: collectionId,
        count: snapshot.size,
      });
    }
    
    // Sort by count (descending)
    collectionDetails.sort((a, b) => b.count - a.count);
    
    console.log('\nCollections to delete:');
    let totalDocs = 0;
    collectionDetails.forEach(detail => {
      console.log(`  - ${detail.id}: ${detail.count} document(s)`);
      totalDocs += detail.count;
    });
    
    console.log(`\nTotal: ${collectionDetails.length} collection(s), ${totalDocs} document(s)`);
    
    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete all documents in the above collections!');
    const answer = await question('\nDo you want to proceed with deletion? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Deletion cancelled.');
      process.exit(0);
    }
    
    // Delete collections
    console.log('\nDeleting collections...\n');
    let totalDeleted = 0;
    let totalErrors = 0;
    
    for (const detail of collectionDetails) {
      try {
        console.log(`Deleting "${detail.id}" (${detail.count} documents)...`);
        const result = await deleteCollection(detail.id);
        totalDeleted += result.deleted;
        totalErrors += result.errors;
        console.log(`  ✅ Deleted ${result.deleted} document(s) from "${detail.id}"`);
      } catch (error) {
        console.error(`  ❌ Error deleting "${detail.id}":`, error.message);
        totalErrors++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('DELETION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Collections processed: ${collectionDetails.length}`);
    console.log(`Documents deleted: ${totalDeleted}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

