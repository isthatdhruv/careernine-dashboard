// app/register/page.tsx

'use client';

import RegisterForm from '../components/RegisterForm';
import Image from 'next/image';
import React, { useEffect } from 'react';
import { auth } from '../firebase';
import { useRouter } from 'next/navigation';

const RegisterPage = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          // User is signed in, redirect to dashboard
          router.replace('/dashboard');
        }
      });

      return () => unsubscribe();
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 py-8 px-4 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Image
            src="/career-9-logo.png"
            alt="Career-9 Logo"
            width={240}
            height={120}
            className="mx-auto"
            priority
          />
          <h1 className="text-3xl font-bold text-white mt-4">Career-9 Navigator 360</h1>
          <p className="text-white/90 mt-2">Your path to career clarity begins here</p>
        </div>
        <div className="bg-white text-gray-900 p-6 rounded-lg shadow-xl">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
