// app/api/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// We're not using this endpoint in the simplified flow
// It's been replaced by directly saving payment details to user record
export async function POST(req: NextRequest) {
  return NextResponse.json({ success: true });
}
