import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function GET() {
  try {
    const auth = getAuth();
    const users = await auth.listUsers();
    
    const creationTimes = users.users.reduce((acc, user) => {
      acc[user.uid] = user.metadata.creationTime;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(creationTimes);
  } catch (error) {
    console.error('Error fetching user creation times:', error);
    return NextResponse.json({ error: 'Failed to fetch user creation times' }, { status: 500 });
  }
} 