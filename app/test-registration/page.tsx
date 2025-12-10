'use client';

import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Input from '../components/Input';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// Import the error overlay component logic
const ErrorOverlay = ({ errorDetails, onClose, onRetry }: {
  errorDetails: {
    title: string;
    message: string;
    nextSteps: string[];
    canRetry: boolean;
  };
  onClose: () => void;
  onRetry: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{errorDetails.title}</h2>
          <p className="text-gray-600 mb-4">{errorDetails.message}</p>
        </div>
        
        {errorDetails.nextSteps && errorDetails.nextSteps.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
            <ul className="space-y-2">
              {errorDetails.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700">
                  <span className="text-blue-600 mr-2 font-bold">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition"
          >
            Close
          </button>
          {errorDetails.canRetry && (
            <button 
              onClick={onRetry} 
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TestRegistrationPage = () => {
  const [formData, setFormData] = useState({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '1234567890',
    countryCode: '+91',
    dob: '01/01/2000',
    gender: 'Male',
    school: 'Test School',
    schoolType: 'CBSE',
    studentClass: '10',
    section: 'A',
  });

  const [selectedError, setSelectedError] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [errorOverlay, setErrorOverlay] = useState<{
    title: string;
    message: string;
    nextSteps: string[];
    canRetry: boolean;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const errorScenarios = {
    'none': 'No Error (Normal Registration)',
    'permission-denied': 'Permission Denied Error',
    'invalid-argument': 'Invalid Data Error',
    'network-error': 'Network Error',
    'firestore-fail': 'Firestore Write Fails',
    'firestore-fail-cleanup-fail': 'Firestore Fails + Auth Cleanup Fails (Refresh Loop Scenario)',
    'email-already-in-use': 'Email Already in Use',
    'orphaned-account-retry': 'Orphaned Account - Try Registering Again (Same Email)',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getErrorDetails = (errorType: string, authCleanupSuccess: boolean = false) => {
    switch (errorType) {
      case 'permission-denied':
        return {
          title: 'Permission Denied',
          message: 'We encountered a permission error while creating your account. This is usually a temporary issue.',
          nextSteps: [
            'Please try registering again in a few moments',
            'If the problem persists, contact support at support@career-9.com',
            'Make sure you have a stable internet connection'
          ],
          canRetry: true
        };
      case 'invalid-argument':
        return {
          title: 'Invalid Data Format',
          message: 'Some of the information you provided contains characters that cannot be processed. Please review the guidelines below and correct your inputs.',
          nextSteps: [
            'Name: Use only letters, spaces, and common punctuation (periods, hyphens, apostrophes). Maximum 100 characters. Avoid control characters or special symbols.',
            'Email: Use only letters (a-z), numbers (0-9), dots (.), underscores (_), plus signs (+), hyphens (-), and @ symbol. Example: john.doe@example.com',
            'Phone: Use exactly 10 digits (0-9 only). No spaces, dashes, or parentheses.',
            'Other fields: Avoid invisible control characters. Text fields support letters, numbers, spaces, and common punctuation.',
            'Remove any copied/pasted text that might contain hidden characters',
            'Try registering again with corrected information'
          ],
          canRetry: true
        };
      case 'email-already-in-use':
        return {
          title: 'Email Already Registered',
          message: 'An account with this email already exists.',
          nextSteps: [
            'Try logging in instead of registering',
            'If you forgot your password, use the "Forgot Password" link',
            'If you believe this is an error, contact support at support@career-9.com'
          ],
          canRetry: false
        };
      case 'orphaned-account-retry':
        return {
          title: 'Incomplete Account Detected',
          message: 'We found an incomplete account with this email. This usually happens when a previous registration didn\'t complete successfully. We\'ve cleaned it up for you.',
          nextSteps: [
            'The incomplete account has been removed',
            'You can now register again with this email',
            'Click "Try Again" to complete your registration',
            'If the problem persists, contact support@career-9.com'
          ],
          canRetry: true
        };
      case 'network-error':
        return {
          title: 'Network Error',
          message: 'We couldn\'t connect to our servers. This might be a temporary network issue.',
          nextSteps: [
            'Check your internet connection',
            'Wait a few moments and try again',
            'If you\'re on a restricted network, try using mobile data',
            'Contact support at support@career-9.com if the problem continues'
          ],
          canRetry: true
        };
      case 'firestore-fail':
        return {
          title: 'Registration Failed',
          message: 'We encountered an error while saving your account information. Your account was not created, so you can safely try again.',
          nextSteps: [
            'Wait a few moments and try registering again',
            'Make sure all required fields are filled correctly',
            'Check your internet connection',
            'If the problem persists, contact support at support@career-9.com'
          ],
          canRetry: true
        };
      case 'firestore-fail-cleanup-fail':
        return {
          title: 'Registration Failed',
          message: 'We encountered an error during registration. Your account may have been partially created. If you get stuck in a loop, you\'ll be automatically signed out.',
          nextSteps: [
            'Try logging in to see if your account was created',
            'If login fails or you get stuck, try registering again with the same email',
            'If you see an "email already in use" error, the system will detect this and help you',
            'If you get stuck in a refresh loop, wait 15 seconds - you\'ll be automatically signed out',
            'Contact support at support@career-9.com for assistance'
          ],
          canRetry: true
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorOverlay(null);

    try {
      if (selectedError === 'none') {
        // Normal registration
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: formData.name });
        
        const userData = {
          personal: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            countryCode: formData.countryCode,
            dob: formData.dob,
            gender: formData.gender,
          },
          educational: {
            school: formData.school,
            schoolType: formData.schoolType,
            studentClass: formData.studentClass,
            section: formData.section || undefined,
          },
          payment: {
            selectedPlan: 'assessment',
            paymentStatus: 'paid',
            amount: 0,
          },
          cardsStatus: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          tenant: 'dalimss',
        };

        await setDoc(doc(db, 'users', user.uid), userData);
        alert('Registration successful! Redirecting to dashboard...');
        router.push('/dashboard');
      } else if (selectedError === 'firestore-fail') {
        // Simulate Firestore failure but successful auth cleanup
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: formData.name });
        
        // Simulate Firestore failure
        throw { code: 'unavailable', message: 'Firestore write failed' };
      } else if (selectedError === 'firestore-fail-cleanup-fail') {
        // Simulate Firestore failure AND auth cleanup failure (refresh loop scenario)
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: formData.name });
        
        // Simulate Firestore failure
        // Note: We can't actually prevent auth cleanup in test, but we simulate the error
        const errorDetails = getErrorDetails('firestore-fail-cleanup-fail', false);
        setErrorOverlay(errorDetails);
        setLoading(false);
        return;
      } else if (selectedError === 'orphaned-account-retry') {
        // Simulate orphaned account retry scenario
        // First, try to create account (will fail with email-already-in-use)
        try {
          await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            // Check if it's orphaned
            try {
              const testSignIn = await signInWithEmailAndPassword(auth, formData.email, formData.password);
              const userDoc = await getDoc(doc(db, 'users', testSignIn.user.uid));
              if (!userDoc.exists()) {
                // Orphaned account - sign out and show special error
                await signOut(auth);
                const errorDetails = getErrorDetails('orphaned-account-retry');
                if (errorDetails) {
                  setErrorOverlay(errorDetails);
                }
                setLoading(false);
                return;
              } else {
                // Normal account exists
                await signOut(auth);
                throw { code: 'auth/email-already-in-use' };
              }
            } catch (checkError) {
              // Sign-in failed - normal account
              throw { code: 'auth/email-already-in-use' };
            }
          } else {
            throw error;
          }
        }
      } else {
        // Simulate other errors
        throw { code: selectedError };
      }
    } catch (error: any) {
      let authCleanupSuccess = false;
      
      // Try to get current user and delete if exists
      const user = auth.currentUser;
      if (user && selectedError !== 'firestore-fail-cleanup-fail') {
        try {
          await user.delete();
          authCleanupSuccess = true;
        } catch (deleteError) {
          console.error('Auth cleanup failed:', deleteError);
        }
      }

      const errorDetails = getErrorDetails(selectedError, authCleanupSuccess);
      if (errorDetails) {
        setErrorOverlay(errorDetails);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">⚠️ TEST MODE</h2>
          <p className="text-yellow-800">
            This is a test registration page for simulating registration failures. 
            Use this to test error handling and user experience.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Registration Form</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <label className="block text-sm font-semibold text-blue-900 mb-2">
                Select Error Scenario:
              </label>
              <select
                value={selectedError}
                onChange={(e) => setSelectedError(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-md bg-white"
              >
                {Object.entries(errorScenarios).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-blue-700 mt-2">
                Choose an error scenario to simulate during registration
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Full Name*"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
              <Input
                type="email"
                placeholder="Email Address*"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password*"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-gray-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              <Input
                type="tel"
                placeholder="Phone Number*"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
              <Input
                type="text"
                placeholder="Date of Birth (DD/MM/YYYY)*"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
              <Input
                as="select"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                placeholder="Gender*"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                className="bg-gray-50"
              />
              <Input
                type="text"
                placeholder="School Name*"
                name="school"
                value={formData.school}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
              <Input
                as="select"
                name="schoolType"
                value={formData.schoolType}
                onChange={handleChange}
                required
                placeholder="School Type*"
                options={[
                  { value: 'State Board', label: 'State Board' },
                  { value: 'CBSE', label: 'CBSE' },
                  { value: 'ICSE', label: 'ICSE' },
                ]}
                className="bg-gray-50"
              />
              <Input
                as="select"
                name="studentClass"
                value={formData.studentClass}
                onChange={handleChange}
                required
                placeholder="Class*"
                options={[
                  { value: '10', label: '10' },
                  { value: '11', label: '11' },
                  { value: '12', label: '12' },
                ]}
                className="bg-gray-50"
              />
              <Input
                as="select"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="Section"
                options={[
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                  { value: 'C', label: 'C' },
                ]}
                className="bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 text-white p-4 rounded-lg text-lg font-semibold transition-all ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : `Test Registration (${errorScenarios[selectedError as keyof typeof errorScenarios]})`}
            </button>
          </form>
        </div>

        {errorOverlay && (
          <ErrorOverlay
            errorDetails={errorOverlay}
            onClose={() => setErrorOverlay(null)}
            onRetry={() => {
              setErrorOverlay(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TestRegistrationPage;

