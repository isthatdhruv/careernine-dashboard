/**
 * Default values for pricing and plans
 * These are fallbacks used when Firestore data cannot be loaded
 */

export const DEFAULT_PRICING = {
  assessment: 99900, // ₹999.00
  counselling: 250000 // ₹2,500.00
};

export const DEFAULT_PLANS = {
  assessment: {
    name: 'Navigator 360 Assessment',
    price: DEFAULT_PRICING.assessment,
    benefits: [
      'Intelligence Based Learning Styles',
      'Customised Personality Development Suggestion',
      'Career Exploration'
    ],
    description: 'Comprehensive assessment to understand your strengths and potential career paths.'
  },
  counselling: {
    name: 'Navigator 360 Mentorship',
    price: DEFAULT_PRICING.counselling,
    benefits: [
      'Navigator 360 Assessment & Personalized 1:1 Counselling Sessions',
      'Deep-Dive Strategy Sessions',
      'Custom Growth Roadmap'
    ],
    description: 'Complete assessment with personalized mentorship to guide your career journey.'
  },
  upgrades: {
    'assessment-to-counselling': {
      name: 'Upgrade to Mentorship',
      description: 'Upgrade from Assessment to full Mentorship plan',
      basePrice: DEFAULT_PRICING.counselling - DEFAULT_PRICING.assessment // Difference between plans
    }
  }
}; 