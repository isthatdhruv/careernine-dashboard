import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function GET() {
  try {
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