const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

// Helper function to search for string in files
const searchInFiles = async (dir, searchString) => {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  let found = false;

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      // Recursively search in subdirectories
      const foundInSubDir = await searchInFiles(filePath, searchString);
      if (foundInSubDir) found = true;
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        if (content.includes(searchString)) {
          console.log(`Found reference to "${searchString}" in ${filePath}`);
          found = true;
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }
  }
  
  return found;
};

async function checkUnusedFirestore() {
  try {
    console.log('Checking for unused Firestore collections and documents...');
    
    // Get all collections
    const collections = await db.listCollections();
    console.log(`Found ${collections.length} collections`);
    
    const projectRoot = path.resolve(__dirname, '..');
    let unusedCollections = [];
    
    // Check each collection
    for (const collection of collections) {
      const collectionId = collection.id;
      console.log(`\nChecking collection: ${collectionId}`);
      
      // Search for collection references in the codebase
      const collectionFound = await searchInFiles(projectRoot, `collection('${collectionId}')`);
      const collectionFound2 = await searchInFiles(projectRoot, `collection("${collectionId}")`);
      
      if (!collectionFound && !collectionFound2) {
        console.log(`WARNING: Collection "${collectionId}" appears to be unused`);
        unusedCollections.push(collectionId);
      }
      
      // Check documents in the collection
      const docs = await db.collection(collectionId).get();
      console.log(`Found ${docs.docs.length} documents in ${collectionId}`);
      
      // Check specific documents
      if (collectionId === 'settings') {
        for (const doc of docs.docs) {
          const docId = doc.id;
          console.log(`Checking settings document: ${docId}`);
          
          // Search for document references in the codebase
          const docFound = await searchInFiles(projectRoot, `doc('settings', '${docId}')`);
          const docFound2 = await searchInFiles(projectRoot, `doc("settings", "${docId}")`);
          const docFound3 = await searchInFiles(projectRoot, `.doc('${docId}')`);
          const docFound4 = await searchInFiles(projectRoot, `.doc("${docId}")`);
          
          if (!docFound && !docFound2 && !docFound3 && !docFound4) {
            console.log(`WARNING: Document "settings/${docId}" appears to be unused`);
          }
        }
      }
    }
    
    console.log('\nSummary:');
    if (unusedCollections.length > 0) {
      console.log(`Found ${unusedCollections.length} potentially unused collections:`);
      unusedCollections.forEach(col => console.log(`- ${col}`));
    } else {
      console.log('No unused collections detected.');
    }
    
  } catch (error) {
    console.error('Error checking Firestore:', error);
  }
}

checkUnusedFirestore()
  .then(() => console.log('Firestore check completed'))
  .catch(err => console.error('Firestore check failed:', err)); 