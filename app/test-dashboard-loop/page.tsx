'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * This page simulates the dashboard refresh loop scenario
 * Use this to test the auto sign-out functionality
 */
const TestDashboardLoopPage = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [countdown, setCountdown] = useState<number>(15);
  const [user, setUser] = useState<any>(null);
  const [documentFound, setDocumentFound] = useState<boolean>(false);
  const documentFoundRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirestore: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;

    const checkAccess = (currentUser: any) => {
      if (!currentUser) {
        setStatus('No user authenticated. Please log in first.');
        return;
      }

      setUser(currentUser);
      setStatus(`User authenticated: ${currentUser.email}`);
      setDocumentFound(false);
      documentFoundRef.current = false;

      // Start countdown
      setCountdown(15);
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownInterval) clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set timeout to redirect if document doesn't appear within 15 seconds
      timeoutId = setTimeout(async () => {
        if (isMounted && !documentFoundRef.current) {
          setStatus('Document not found after 15 seconds. Signing out...');
          
          // Sign out the user to prevent refresh loop
          try {
            await signOut(auth);
            setStatus('✅ Successfully signed out orphaned auth user');
            setTimeout(() => {
              alert('We couldn\'t find your account information. This indicates your registration didn\'t complete successfully.\n\nYou have been signed out. Please try registering again.\n\nIf the problem persists, contact support@career-9.com');
              router.replace('/login');
            }, 500);
          } catch (signOutError) {
            setStatus(`❌ Error signing out user: ${signOutError}`);
          }
        }
      }, 15000);

      // Use Firestore listener to wait for document to appear
      unsubscribeFirestore = onSnapshot(
        doc(db, 'users', currentUser.uid),
        (userDoc) => {
          if (!isMounted) return;

          if (!userDoc.exists()) {
            setStatus('Document does not exist. Waiting...');
            return;
          }

          // Document found!
          setDocumentFound(true);
          documentFoundRef.current = true;
          setStatus('✅ Document found! User data exists.');
          setCountdown(0);

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
        },
        (err) => {
          console.error('Error in Firestore listener:', err);
          if (isMounted) {
            setStatus(`Error: ${err.message}`);
          }
        }
      );
    };

    // Use auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        checkAccess(currentUser);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      unsubscribeAuth();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">⚠️ DASHBOARD LOOP TEST</h2>
          <p className="text-yellow-800">
            This page simulates the dashboard refresh loop scenario. 
            It shows what happens when a user is authenticated but has no Firestore document.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Refresh Loop Prevention Test</h1>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Current Status:</h3>
              <p className="text-gray-700">{status}</p>
            </div>

            {user && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">User Information:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>UID:</strong> {user.uid}</li>
                  <li><strong>Email:</strong> {user.email}</li>
                  <li><strong>Document Found:</strong> {documentFound ? '✅ Yes' : '❌ No'}</li>
                </ul>
              </div>
            )}

            {!documentFound && countdown > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">Countdown to Auto Sign-Out:</h3>
                <div className="text-4xl font-bold text-red-600 text-center py-4">
                  {countdown}
                </div>
                <p className="text-sm text-red-700 text-center">
                  If document is not found, user will be signed out automatically
                </p>
              </div>
            )}

            {documentFound && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
                <p className="text-green-700">
                  User document was found. No sign-out needed.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to Test:</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              <strong>Create an orphaned account:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li>Go to <code className="bg-gray-100 px-2 py-1 rounded">/test-registration</code></li>
                <li>Select "Firestore Fails + Auth Cleanup Fails"</li>
                <li>Register with a test email</li>
                <li>This creates auth but no Firestore document</li>
              </ul>
            </li>
            <li>
              <strong>Or manually create:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li>Register normally</li>
                <li>Go to Firebase Console</li>
                <li>Delete the user's Firestore document (keep auth user)</li>
                <li>Come back to this page</li>
              </ul>
            </li>
            <li>
              <strong>Observe the behavior:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li>Page will show countdown (15 seconds)</li>
                <li>If document not found, user is signed out</li>
                <li>Alert appears with instructions</li>
                <li>Redirects to login page</li>
              </ul>
            </li>
            <li>
              <strong>Test login page:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li>After sign-out, try logging in</li>
                <li>Login page should detect orphaned account</li>
                <li>Should NOT auto-redirect to dashboard</li>
                <li>Should show error message</li>
              </ul>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/test-registration')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Test Registration
          </button>
          <button
            onClick={() => router.push('/test-errors')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            View Error Previews
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Real Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestDashboardLoopPage;

