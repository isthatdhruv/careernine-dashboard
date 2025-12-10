'use client';

import { useState } from 'react';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Input from './Input';
import Link from 'next/link';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        'If an account exists with this email, a password reset link has been sent. Please check your inbox.'
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errorCode = (err as { code?: string }).code || 'unknown-error';

        switch (errorCode) {
          case 'auth/invalid-email':
            setError('Invalid email address. Please check and try again.');
            break;
          case 'auth/user-not-found':
            setMessage(
              'If an account exists with this email, a password reset link has been sent. Please check your inbox.'
            );
            break;
          case 'auth/too-many-requests':
            setError(
              'Too many password reset requests. Please wait a while before trying again.'
            );
            break;
          default:
            setError('An error occurred. Please try again later.');
            break;
        }
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handlePasswordReset} className="space-y-6 w-full">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          className="bg-gray-50"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full bg-blue-600 text-white p-4 rounded-lg text-lg font-semibold transition-all ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Sending...</span>
          </div>
        ) : (
          'Send Reset Email'
        )}
      </button>

      <div className="text-center mt-4">
        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium text-sm">
          Back to Login
        </Link>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
