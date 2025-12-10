'use client';

import { Suspense } from 'react';
import LoginForm from '../components/LoginForm';
import Image from 'next/image';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 py-8 px-4 text-white">
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <Image
          src="/career-9-logo.png"
          alt="Career-9 Logo"
          width={240}
          height={120}
          className="mx-auto"
        />
        <h1 className="mt-6 text-3xl font-extrabold text-white">Career-9 Navigator 360</h1>
        <p className="mt-2 text-center text-sm text-white/90">
          Your personalized career guidance platform
        </p>
      </div>
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-6">Login to your account</h2>
          <Suspense fallback={<LoadingSpinner />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

export default LoginPage;
