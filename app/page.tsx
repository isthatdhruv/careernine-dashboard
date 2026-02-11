'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated, redirect to admin dashboard
        router.replace('/admin/dashboard');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show nothing while checking auth
  return null;
}
