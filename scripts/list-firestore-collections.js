const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

async function listAllCollections() {
  try {
    console.log('Querying Firestore for all collections...\n');
    
    // Get all collections
    const collections = await firestore.listCollections();
    
    console.log(`Found ${collections.length} collection(s):\n`);
    console.log('='.repeat(80));
    
    const collectionData = [];
    
    for (const collectionRef of collections) {
      const collectionId = collectionRef.id;
      
      // Get document count
      const snapshot = await collectionRef.get();
      const docCount = snapshot.size;
      
      // Get sample document IDs (first 5)
      const sampleDocIds = snapshot.docs.slice(0, 5).map(doc => doc.id);
      
      collectionData.push({
        name: collectionId,
        count: docCount,
        sampleIds: sampleDocIds,
      });
      
      console.log(`Collection: ${collectionId}`);
      console.log(`  Documents: ${docCount}`);
      
      if (docCount > 0) {
        console.log(`  Sample document IDs: ${sampleDocIds.join(', ')}${docCount > 5 ? '...' : ''}`);
      }
      
      // For settings collection, show sub-documents
      if (collectionId === 'settings' && docCount > 0) {
        console.log(`  Sub-documents:`);
        snapshot.docs.forEach(doc => {
          console.log(`    - ${doc.id}`);
        });
      }
      
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log(`Total collections: ${collections.length}`);
    const totalDocs = collectionData.reduce((sum, col) => sum + col.count, 0);
    console.log(`Total documents: ${totalDocs}`);
    
    console.log('\nCollection breakdown:');
    collectionData.forEach(col => {
      console.log(`  ${col.name}: ${col.count} document(s)`);
    });
    
    // Check for expected collections
    const expectedCollections = ['users', 'coupons', 'payments', 'settings', 'tenants'];
    const foundCollections = collectionData.map(col => col.name);
    const missingCollections = expectedCollections.filter(col => !foundCollections.includes(col));
    
    if (missingCollections.length > 0) {
      console.log('\n⚠️  Expected collections not found:');
      missingCollections.forEach(col => {
        console.log(`  - ${col}`);
      });
    }
    
    const unexpectedCollections = foundCollections.filter(col => !expectedCollections.includes(col));
    if (unexpectedCollections.length > 0) {
      console.log('\n⚠️  Unexpected collections found:');
      unexpectedCollections.forEach(col => {
        console.log(`  - ${col}`);
      });
    }
    
  } catch (error) {
    console.error('Error querying Firestore:', error);
    process.exit(1);
  }
}

listAllCollections()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });







