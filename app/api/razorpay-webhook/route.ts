import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body;
  try {
    console.log('📦 rawBody:', rawBody);
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error('Failed to parse webhook body:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('🪝 Webhook payload:', JSON.stringify(body, null, 2));

  const payment = body?.payload?.payment?.entity;

  if (!payment || !payment.email) {
    return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 });
  }

  const email = payment.email;
  const amount = payment.amount / 100;
  const paymentType = amount === 499 ? 'assessment' : 'assessment+counselling';

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        paymentStatus: 'paid',
        paymentType,
        razorpayPaymentId: payment.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
