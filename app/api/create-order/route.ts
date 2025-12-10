// app/api/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/firebase-admin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const { amount, email, phone, couponCode, plan } = await req.json();

  let finalAmount = amount;

  // Validate and apply coupon from Firestore
  if (couponCode) {
    try {
      // Check if coupon exists in database through collection query
      const couponsRef = db.collection('coupons');
      const couponQuery = await couponsRef.where('code', '==', couponCode.toUpperCase()).get();
      
      if (!couponQuery.empty) {
        const coupon = couponQuery.docs[0].data();
        
        // Check if coupon has a specific plan requirement
        if (coupon.plan && coupon.plan !== plan) {
          // Coupon plan does not match selected plan
          return NextResponse.json({ error: 'Coupon plan does not match selected plan' }, { status: 400 });
        }
        
        // Check if coupon is expired
        if (coupon.expiryDate && new Date(coupon.expiryDate.toDate()) < new Date()) {
          return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
        }
        
        // Apply coupon discount
        if (coupon.setPrice) {
          // Fixed price coupon (e.g., set price to ₹1)
          finalAmount = coupon.setPrice;
        } else if (coupon.discountType === 'percentage') {
          // Percentage discount
          finalAmount = Math.round(amount * (1 - coupon.discountValue / 100));
        } else {
          // Fixed amount discount
          finalAmount = Math.max(0, amount - coupon.discountValue);
        }
        
        // Ensure minimum amount is 100 paise (₹1)
        finalAmount = Math.max(finalAmount, 100);
      } else {
        console.log('Coupon not found:', couponCode);
      }
    } catch (e) {
      console.error('Error processing coupon:', e);
      // Continue with original amount if coupon processing fails
    }
  }

  const options = {
    amount: finalAmount,
    currency: 'INR',
    receipt: `receipt_${Math.random().toString(36).substring(2, 10)}`,
    notes: {
      email,
      phone,
      plan,
      coupon: couponCode || 'none',
    },
  };

  try {
    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Order creation failed:', error);
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
  }
}
