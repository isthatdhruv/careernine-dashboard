const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local for Next.js
try {
  const envConfig = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
    
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  console.log('Loaded environment variables from .env.local');
} catch (error) {
  console.warn('Could not load .env.local file:', error.message);
}

// Initialize Firebase Admin with credentials
let app;
try {
  // Check if we have the Firebase service account in environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Service account provided as JSON string in env var
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Using Firebase service account from environment variable');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Path to service account file
    app = admin.initializeApp();
    console.log('Using service account from GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    // Try with just project ID
    app = admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'assessment-demo'
    });
    console.log('Using Firebase project ID from environment variable');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

async function setupPricingAndCoupons() {
  console.log('Setting up pricing and coupon data in Firebase...');
  
  try {
    // Ensure settings collection exists by first checking if it exists
    const settingsRef = db.collection('settings');
    const settingsSnapshot = await settingsRef.get();
    if (settingsSnapshot.empty) {
      console.log('Creating settings collection...');
    } else {
      console.log('Settings collection already exists');
    }

    // Set up pricing
    console.log('Setting up pricing data...');
    await db.doc('settings/pricing').set({
      assessment: 99900,  // ₹999 (stored in paise)
      counselling: 250000 // ₹2,500 (stored in paise)
    });
    console.log('Pricing data set successfully');

    // Set up plan details
    console.log('Setting up plan details...');
    await db.doc('settings/plans').set({
      assessment: {
        name: 'Navigator 360 Assessment',
        price: 99900,
        benefits: [
          'Intelligence Based Learning Styles',
          'Customised Personality Development Suggestion',
          'Career Exploration'
        ],
        description: 'Comprehensive assessment to understand your strengths and potential career paths.'
      },
      counselling: {
        name: 'Navigator 360 Mentorship',
        price: 250000,
        benefits: [
          'Navigator 360 Assessment & Personalized 1:1 Counselling Sessions',
          'Deep-Dive Strategy Sessions',
          'Custom Growth Roadmap'
        ],
        description: 'Complete assessment with personalized mentorship to guide your career journey.'
      }
    });
    console.log('Plan details set successfully');

    // Ensure coupons collection exists
    const couponsRef = db.collection('coupons');
    const couponsSnapshot = await couponsRef.get();
    if (couponsSnapshot.empty) {
      console.log('Creating coupons collection...');
    } else {
      console.log('Coupons collection already exists');
      console.log('Deleting existing coupons before creating new ones...');
      
      // Delete existing coupons
      const batchDelete = db.batch();
      const existingCoupons = await couponsRef.get();
      existingCoupons.forEach(doc => {
        batchDelete.delete(doc.ref);
      });
      await batchDelete.commit();
      console.log('Existing coupons deleted');
    }

    // Create coupon codes
    console.log('Creating new coupon codes...');
    const coupons = [
      {
        id: 'WELCOME20',
        data: {
          code: 'WELCOME20',
          discountType: 'percentage',
          discountValue: 20,
          expiryDate: admin.firestore.Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 3))), // 3 months from now
          maxUses: 100,
          description: 'Welcome discount - 20% off'
        }
      },
      {
        id: 'DEMO1',
        data: {
          code: 'DEMO1',
          discountType: 'fixed',
          discountValue: 99800, // Make price Rs. 1 by discounting Rs. 998 from Rs. 999
          expiryDate: admin.firestore.Timestamp.fromDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1))), // 1 year from now
          maxUses: 1000,
          description: 'Demo discount - Rs. 1 final price'
        }
      }
    ];

    // Create coupon batch
    const batch = db.batch();
    coupons.forEach(coupon => {
      const couponRef = db.collection('coupons').doc(coupon.id);
      batch.set(couponRef, coupon.data);
    });

    await batch.commit();
    console.log('Coupon codes created successfully');

    // Verify the data was created
    console.log('\nVerifying data was created...');
    const pricingDoc = await db.doc('settings/pricing').get();
    const plansDoc = await db.doc('settings/plans').get();
    const couponDocs = await db.collection('coupons').get();
    
    console.log(`Pricing document exists: ${pricingDoc.exists}`);
    console.log(`Plans document exists: ${plansDoc.exists}`);
    console.log(`Number of coupon documents: ${couponDocs.size}`);

    console.log('\nSetup completed successfully!');
    console.log('\nAvailable coupon codes:');
    console.log('- WELCOME20: 20% off any plan');
    console.log('- DEMO1: Sets price to Rs. 1 (for demo purposes)');

  } catch (error) {
    console.error('Error setting up data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupPricingAndCoupons();
