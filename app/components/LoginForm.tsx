'use client';

import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from './Input';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [authChecking, setAuthChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    if (errorMessage) setError(errorMessage);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && window.location.pathname === '/login') {
        // User is already authenticated, redirect to admin dashboard
        router.push('/admin/dashboard');
      } else {
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router, errorMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Successful login - redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setSubmitting(false);

      if (err instanceof FirebaseError) {
        console.error('Login FirebaseError:', err.code, err.message);
        switch (err.code) {
          case 'auth/invalid-email':
            setError('Invalid email address. Please check and try again.');
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            setError('Incorrect email or password. Please double-check and try again.');
            break;
          case 'auth/user-not-found':
            setError('No admin account found with this email.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please wait a moment and try again.');
            break;
          default:
            setError('We couldn't sign you in. Please try again shortly or contact support@career-9.com.');
            break;
        }
      } else {
        console.error('Login unexpected error:', err);
        setError('We couldn't reach the login service. Please check your internet connection and try again.');
      }
    }
  };

  if (authChecking) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      <div className="space-y-4">
        <Input
          type="email"
          placeholder="Admin Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          required
          className="bg-gray-50"
        />
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
            required
            className="bg-gray-50 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full bg-blue-600 text-white p-4 rounded-lg text-lg font-semibold transition-all ${
          submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
        }`}
      >
        {submitting ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Logging in...</span>
          </div>
        ) : (
          'Login to Admin Dashboard'
        )}
      </button>

      <div className="text-center text-sm text-gray-600 mt-4">
        <p>Admin access only. Contact support@career-9.com for assistance.</p>
      </div>
    </form>
  );
};

export default LoginForm;
