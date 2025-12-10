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

async function fixTenantAssignment() {
  try {
    console.log('Starting tenant assignment fix...');
    
    // Get all users from the last 48 hours (simpler query)
    const twoDaysAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .orderBy('createdAt', 'desc')
      .limit(100) // Get recent users
      .get();
    
    console.log(`Found ${snapshot.docs.length} recent users`);
    
    let fixedCount = 0;
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate();
      const tenant = data.tenant || 'default';
      const paymentAmount = data.payment?.amount || 0;
      
      // Only process users from last 48 hours with default tenant and 0 payment
      if (createdAt && createdAt > twoDaysAgo && tenant === 'default' && paymentAmount === 0) {
        console.log(`Fixing user: ${data.personal?.name} (${doc.id}) - Amount: ₹${paymentAmount/100} - Created: ${createdAt.toLocaleString()}`);
        batch.update(doc.ref, { tenant: 'nbis' });
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`Successfully fixed ${fixedCount} users' tenant assignment`);
    } else {
      console.log('No users needed fixing');
    }
    
  } catch (error) {
    console.error('Error fixing tenant assignment:', error);
  }
}

fixTenantAssignment(); 