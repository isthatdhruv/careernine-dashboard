import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { uid, newPassword } = await request.json();

    if (!uid || !newPassword) {
      return NextResponse.json(
        { error: 'uid and newPassword are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Update password in Firebase Auth
    await auth.updateUser(uid, { password: newPassword });

    // Update plaintextPassword in Firestore
    await db.collection('users').doc(uid).update({
      plaintextPassword: newPassword,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
