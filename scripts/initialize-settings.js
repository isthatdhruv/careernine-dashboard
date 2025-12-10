const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

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

async function initializeSettings() {
  try {
    // Pricing settings
    const pricing = {
      assessment: 99900, // ₹999.00
      counselling: 250000, // ₹2,500.00
      updatedAt: new Date()
    };

    // Plan details
    const plans = {
      assessment: {
        name: 'Navigator 360 Assessment',
        price: 99900,
        benefits: [
          'Intelligence Based Learning Styles',
          'Customised Personality Development Suggestion',
          'Career Exploration'
        ],
        description: 'Comprehensive assessment to understand your strengths and potential career paths.',
        features: [
          'Detailed personality assessment',
          'Learning style analysis',
          'Career path suggestions',
          'Comprehensive report'
        ],
        updatedAt: new Date()
      },
      counselling: {
        name: 'Navigator 360 Mentorship',
        price: 250000,
        benefits: [
          'Navigator 360 Assessment & Personalized 1:1 Counselling Sessions',
          'Deep-Dive Strategy Sessions',
          'Custom Growth Roadmap'
        ],
        description: 'Complete assessment with personalized mentorship to guide your career journey.',
        features: [
          'All features of Assessment plan',
          'One-on-one counseling sessions',
          'Personalized career guidance',
          'Expert mentor support',
          'Follow-up recommendations'
        ],
        updatedAt: new Date()
      },
      upgrades: {
        'assessment-to-counselling': {
          name: 'Upgrade to Mentorship',
          description: 'Upgrade from Assessment to full Mentorship plan',
          basePrice: 150100, // Difference between plans
          updatedAt: new Date()
        }
      }
    };

    // App configuration
    const appConfig = {
      title: 'Career Navigator 360',
      calendlyUrl: 'https://calendly.com/prasad-khake-career-9/30min',
      supportEmail: 'support@career-9.com',
      updatedAt: new Date(),
      features: {
        showUpgradeButton: true,
        enableCoupons: true,
        enableCalendly: true
      }
    };

    // Save all settings
    const batch = db.batch();
    
    // Check if pricing exists
    const pricingDoc = await db.collection('settings').doc('pricing').get();
    if (!pricingDoc.exists) {
      batch.set(db.collection('settings').doc('pricing'), pricing);
      console.log('Creating pricing settings');
    } else {
      console.log('Pricing settings already exist');
    }

    // Check if plans exist
    const plansDoc = await db.collection('settings').doc('plans').get();
    if (!plansDoc.exists) {
      batch.set(db.collection('settings').doc('plans'), plans);
      console.log('Creating plans settings');
    } else {
      // Check if upgrade plan exists
      const plansData = plansDoc.data();
      if (!plansData.upgrades || !plansData.upgrades['assessment-to-counselling']) {
        console.log('Adding upgrade plan to existing plans document');
        await db.collection('settings').doc('plans').update({
          'upgrades': {
            'assessment-to-counselling': {
              name: 'Upgrade to Mentorship',
              description: 'Upgrade from Assessment to full Mentorship plan',
              basePrice: 150100, // Difference between plans
              updatedAt: new Date()
            }
          }
        });
        console.log('Upgrade plan added successfully');
      } else {
        console.log('Plans settings with upgrade plan already exist');
      }
    }

    // Check if app config exists
    const configDoc = await db.collection('settings').doc('config').get();
    if (!configDoc.exists) {
      batch.set(db.collection('settings').doc('config'), appConfig);
      console.log('Creating app configuration');
    } else {
      console.log('App configuration already exists');
    }

    // Commit all changes
    await batch.commit();
    console.log('All settings initialized successfully');
    
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}

initializeSettings()
  .then(() => console.log('Settings initialization complete'))
  .catch(err => console.error('Settings initialization failed:', err)); 