import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const {
      basicPlanName = 'Career Compass Basic',
      basicPlanPrice = 99900, // Default: ₹999
      proPlanName = 'Career Compass Pro',
      proPlanPrice = 250000, // Default: ₹2,500
      createCoupon = false,
      couponCode = 'DEMO1',
      couponDiscount = 99800 // Default: makes price ₹1
    } = requestData;

    // Set up pricing
    await db.collection('settings').doc('pricing').set({
      assessment: basicPlanPrice,  // Basic plan price (in paise)
      counselling: proPlanPrice    // Pro plan price (in paise)
    });

    // Set up plan details
    await db.collection('settings').doc('plans').set({
      assessment: {
        name: basicPlanName,
        price: basicPlanPrice,
        benefits: [
          'Comprehensive Skills Assessment',
          'Personalized Career Insights Report',
          'Strengths & Interest Analysis',
          'Detailed Subject Recommendations',
          'Self-guided Career Exploration'
        ],
        description: 'Discover your strengths and potential career paths with a comprehensive assessment and personalized report.'
      },
      counselling: {
        name: proPlanName,
        price: proPlanPrice,
        benefits: [
          'Everything in Basic Plan',
          'One-on-One Mentoring Sessions',
          'Expert Career Guidance',
          'Personalized Roadmap Development',
          'Academic & Career Planning Support'
        ],
        description: 'Get expert guidance and mentorship to navigate your career journey with personalized counseling sessions.'
      }
    });

    // Create coupon code if requested
    if (createCoupon) {
      await db.collection('coupons').doc(couponCode).set({
        code: couponCode,
        discountType: 'fixed',
        discountValue: couponDiscount,
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
        maxUses: 1000,
        description: `Demo discount - Makes price ₹${(basicPlanPrice - couponDiscount) / 100}`,
        createdAt: new Date()
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pricing data updated successfully!' + (createCoupon ? ' Coupon created.' : '')
    });
  } catch (error) {
    console.error('Error setting up pricing data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set up pricing data' },
      { status: 500 }
    );
  }
} 