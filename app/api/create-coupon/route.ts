import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { code, discountType, discountValue, expiryDate, plan, setPrice } = await request.json();

    if (!code || !discountType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Create coupon document in Firestore
    const couponRef = db.collection('coupons').doc(code.toUpperCase());
    
    await couponRef.set({
      code: code.toUpperCase(),
      discountType: discountType, // 'percentage' or 'fixed' or 'setPrice'
      discountValue: discountType !== 'setPrice' ? parseInt(discountValue) : undefined,
      setPrice: discountType === 'setPrice' ? parseInt(setPrice) : undefined,
      plan: plan || null,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(new Date().getFullYear() + 1, 0, 1), // Default to next year
      createdAt: new Date(),
      maxUses: 1000,
      description: discountType === 'percentage' ? `${discountValue}% discount` : discountType === 'setPrice' ? `Set price to ₹${setPrice/100}` : `₹${discountValue / 100} discount`
    });

    return NextResponse.json({ success: true, message: 'Coupon created successfully' });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
} 