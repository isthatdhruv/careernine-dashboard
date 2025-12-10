import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { DEFAULT_PRICING } from '../../utils/defaults';

export async function POST(req: Request) {
  try {
    const { couponCode, email } = await req.json();

    if (!couponCode) {
      return NextResponse.json({ 
        valid: false, 
        message: 'No coupon code provided' 
      });
    }

    // Check if coupon exists in database
    const couponsRef = db.collection('coupons');
    const couponQuery = await couponsRef.where('code', '==', couponCode.toUpperCase()).get();

    if (couponQuery.empty) {
      return NextResponse.json({ 
        valid: false, 
        message: 'Invalid coupon code. Please check and try again.' 
      });
    }

    const couponData = couponQuery.docs[0].data();

    // Check if coupon is expired
    if (couponData.expiryDate && new Date(couponData.expiryDate.toDate()) < new Date()) {
      return NextResponse.json({ 
        valid: false, 
        message: 'This coupon has expired. Please try another code.' 
      });
    }

    // Get base prices from settings
    const pricingDoc = await db.collection('settings').doc('pricing').get();
    const baseAmounts = pricingDoc.exists ? pricingDoc.data() : DEFAULT_PRICING;

    // Calculate discounted prices
    let discountedPrices = { ...baseAmounts };
    
    if (couponData.discountType === 'percentage') {
      discountedPrices.assessment = Math.round(baseAmounts.assessment * (1 - couponData.discountValue / 100));
      discountedPrices.counselling = Math.round(baseAmounts.counselling * (1 - couponData.discountValue / 100));
      
      return NextResponse.json({
        valid: true,
        message: `${couponData.discountValue}% discount applied!`,
        prices: discountedPrices
      });
    } else {
      // Fixed amount discount
      discountedPrices.assessment = Math.max(0, baseAmounts.assessment - couponData.discountValue);
      discountedPrices.counselling = Math.max(0, baseAmounts.counselling - couponData.discountValue);
      
      return NextResponse.json({
        valid: true,
        message: `₹${couponData.discountValue / 100} discount applied!`,
        prices: discountedPrices
      });
    }
  } catch (error) {
    console.error('Error checking coupon:', error);
    return NextResponse.json({ 
      valid: false, 
      message: 'Error validating coupon. Please try again.' 
    });
  }
} 