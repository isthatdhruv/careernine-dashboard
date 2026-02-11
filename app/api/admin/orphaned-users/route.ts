import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { verifyAdmin } from '@/app/lib/admin-auth';

const auth = getAuth();
const firestore = db;

const listAllAuthUsers = async (): Promise<any[]> => {
  const users: any[] = [];

  let pageToken: string | undefined;

  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
};

export async function GET(req: NextRequest) {
  const authError = verifyAdmin(req);
  if (authError) return authError;

  try {
    const authUsers = await listAllAuthUsers();
    const firestoreSnapshot = await firestore.collection('users').get();
    const firestoreIds = new Set(firestoreSnapshot.docs.map((doc) => doc.id));
    const authIds = new Set(authUsers.map((user) => user.uid));

    const orphanedUsers = authUsers
      .filter((user) => !firestoreIds.has(user.uid))
      .map((user) => {
        const tenantClaim =
          typeof user.customClaims?.tenant === 'string' ? user.customClaims.tenant : null;
        const fallbackTenant = user.email?.split('@')[1]?.split('.')[0] ?? null;
        const resolvedTenant = (tenantClaim || fallbackTenant || 'unknown').toLowerCase();

        return {
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? '',
          creationTime: user.metadata.creationTime ?? null,
          lastSignInTime: user.metadata.lastSignInTime ?? null,
          tenant: resolvedTenant,
          disabled: user.disabled,
        };
      });

    const firestoreOrphans = firestoreSnapshot.docs
      .filter((docSnapshot) => !authIds.has(docSnapshot.id))
      .map((docSnapshot) => {
        const data = docSnapshot.data() as any;
        return {
          uid: docSnapshot.id,
          email: data?.personal?.email ?? '',
          name: data?.personal?.name ?? '',
          createdAt: data?.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
      });

    return NextResponse.json({
      orphanedUsers,
      firestoreOrphans,
      totals: {
        authUsers: authUsers.length,
        firestoreUsers: firestoreIds.size,
        orphanedUsers: orphanedUsers.length,
        firestoreOnlyUsers: firestoreOrphans.length,
      },
    });
  } catch (error) {
    console.error('Error listing orphaned users:', error);
    return NextResponse.json({ error: 'Failed to list orphaned users' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const { uid, target = 'auth' } = await request.json();

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (target === 'firestore') {
      await firestore.collection('users').doc(uid).delete();
      return NextResponse.json({ success: true, target: 'firestore' });
    }

    await auth.deleteUser(uid);

    try {
      await firestore.collection('users').doc(uid).delete();
    } catch (firestoreError) {
      console.warn(`Failed to delete Firestore document for ${uid}:`, firestoreError);
    }

    return NextResponse.json({ success: true, target: 'auth' });
  } catch (error: any) {
    console.error('Error deleting orphaned user:', error);

    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete orphaned user' }, { status: 500 });
  }
}

