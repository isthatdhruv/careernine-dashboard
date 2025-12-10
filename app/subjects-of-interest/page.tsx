'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import SubjectsOfInterestForm from '../components/SubjectsOfInterestForm';

const SubjectsOfInterestPage = () => {
  const [classLevel, setClassLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserClass = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.debug("No user found, redirecting to login.");
        router.push('/login');
        return;
      }

      console.debug("Fetching user data for user ID:", user.uid);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.debug("Fetched user data:", userData);

          if (userData?.educational?.studentClass) {
            console.debug("StudentClass field found:", userData.educational.studentClass);
            setClassLevel(userData.educational.studentClass);
          } else {
            console.warn("StudentClass field is missing for user:", user.uid);
            setClassLevel(null); // Explicitly set to null if studentClass is missing
          }
        } else {
          console.warn("No document found for user:", user.uid);
        }
      } catch (error) {
        console.error("Error fetching studentClass:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserClass();
  }, [router]);

  if (loading) {
    console.debug("Page is loading...");
    return <p>Loading...</p>;
  }

  if (!classLevel) {
    console.warn("StudentClass not found for the user.");
    return (
      <div className="text-center">
        <p className="text-red-500">Class level not found. Please contact support.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  console.debug("StudentClass found:", classLevel);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-20">
      <SubjectsOfInterestForm />
    </div>
  );
};

export default SubjectsOfInterestPage;
