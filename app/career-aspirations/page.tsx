'use client';

import React, { useEffect, useState } from 'react';
import CareerAspirationsForm from '../components/CareerAspirationsForm';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

const CareerAspirationsPage = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          router.push('/login');
          return;
        }

        const userData = userDoc.data();
        const userClass = Number(userData.educational?.studentClass || 0);

        // Check if user is in class 9 or above
        if (userClass < 9) {
          console.log('User in class below 9, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Error checking user access:', err);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-20">
      <CareerAspirationsForm />
    </div>
  );
};

export default CareerAspirationsPage;
