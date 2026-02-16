'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from './Input';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

function getSubdomain() {
  if (typeof window === 'undefined') return '';
  const host = window.location.host;
  const [hostname] = host.split(':');
  const parts = hostname.split('.');
  if (hostname === 'localhost') return 'localhost';
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
  if (parts.length === 3) return parts[0];
  if (parts.length === 2) return '';
  return '';
}

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [controlNumber, setControlNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [authChecking, setAuthChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error');
  const [isKvs, setIsKvs] = useState(false);

  useEffect(() => {
    setIsKvs(getSubdomain() === 'kvs');
  }, []);

  useEffect(() => {
    if (errorMessage) setError(errorMessage);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Only redirect if we're actually on the login page
        if (window.location.pathname === '/login') {
          // Check if user has a Firestore document before redirecting
          // This prevents redirect loop for orphaned auth accounts
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              router.push('/dashboard');
            } else {
              // User is authenticated but has no document - this is an orphaned account
              // Don't redirect, let them try logging in again or register
              console.warn('Authenticated user has no Firestore document - orphaned account detected');
              setError('Your account appears to be incomplete. Please try logging in again, or register if you don\'t have an account.');
              setAuthChecking(false);
            }
          } catch (error) {
            console.error('Error checking user document:', error);
            // On error, still try to redirect (might be a temporary issue)
            router.push('/dashboard');
          }
        }
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
      const loginEmail = isKvs ? `${controlNumber.trim().toLowerCase()}@kvs.internal` : email;
      console.log('Login attempt with email:', loginEmail, 'isKvs:', isKvs, 'controlNumber:', controlNumber);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      const user = userCredential.user;
      
      try {
        // Check if user has a Firestore document before redirecting
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          // Document exists - safe to redirect
          router.push('/dashboard');
          return;
        } else {
          // User is authenticated but has no document - orphaned account
          setSubmitting(false);
          setError('We couldn\'t find your account profile. This usually means your previous registration didn\'t finish. Please register again or contact support@career-9.com.');
          
          // Sign out the orphaned account to prevent issues
          try {
            await signOut(auth);
            console.log('Signed out orphaned account after login attempt');
          } catch (signOutError) {
            console.error('Error signing out orphaned account:', signOutError);
          }
          return;
        }
      } catch (docError) {
        console.error('Error checking user document during login:', docError);
        setSubmitting(false);
        setError('We had trouble verifying your account profile. Please try again in a moment or contact support@career-9.com if this continues.');
        return;
      }
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
            setError(isKvs ? 'Incorrect control number or password. Please double-check and try again.' : 'Incorrect email or password. Please double-check and try again.');
            break;
          case 'auth/user-not-found':
            setError(isKvs ? 'No account found with this control number. Please register first.' : 'No account found with this email. Please sign up.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please wait a moment and try again.');
            break;
          default:
            setError('We couldn’t sign you in. Please try again shortly or contact support@career-9.com.');
            break;
        }
      } else {
        console.error('Login unexpected error:', err);
        setError('We couldn’t reach the login service. Please check your internet connection or browser extensions and try again.');
      }
    }
  };

  if (authChecking) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      <div className="space-y-4">
        {isKvs ? (
          <Input
            type="text"
            placeholder="Control Number"
            value={controlNumber}
            onChange={(e) => setControlNumber(e.target.value)}
            name="controlNumber"
            required
            className="bg-gray-50"
          />
        ) : (
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            required
            className="bg-gray-50"
          />
        )}
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
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
          'Login'
        )}
      </button>

      <div className="flex flex-col space-y-2 text-center text-sm text-gray-600 mt-4">
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
            Register here
          </Link>
        </p>
        {!isKvs && (
          <p>
            Forgot your password?{' '}
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500 font-medium">
              Reset Password
            </Link>
          </p>
        )}
      </div>
    </form>
  );
};

export default LoginForm;
