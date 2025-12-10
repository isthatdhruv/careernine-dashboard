'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, CreditCardIcon, TagIcon } from '@heroicons/react/24/outline';

// Copy of the error overlay component from RegisterForm
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

const TestErrorsPage = () => {
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const errorScenarios = {
    'permission-denied': {
      title: 'Permission Denied',
      message: 'We encountered a permission error while creating your account. This is usually a temporary issue.',
      nextSteps: [
        'Please try registering again in a few moments',
        'If the problem persists, contact support at support@career-9.com',
        'Make sure you have a stable internet connection'
      ],
      canRetry: true
    },
    'invalid-argument': {
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
    },
    'email-already-in-use': {
      title: 'Email Already Registered',
      message: 'An account with this email already exists.',
      nextSteps: [
        'Try logging in instead of registering',
        'If you forgot your password, use the "Forgot Password" link',
        'If you believe this is an error, contact support at support@career-9.com'
      ],
      canRetry: false
    },
    'network-error': {
      title: 'Network Error',
      message: 'We couldn\'t connect to our servers. This might be a temporary network issue.',
      nextSteps: [
        'Check your internet connection',
        'Wait a few moments and try again',
        'If you\'re on a restricted network, try using mobile data',
        'Contact support at support@career-9.com if the problem continues'
      ],
      canRetry: true
    },
    'registration-failed-cleanup-success': {
      title: 'Registration Failed',
      message: 'We encountered an error while saving your account information. Your account was not created, so you can safely try again.',
      nextSteps: [
        'Wait a few moments and try registering again',
        'Make sure all required fields are filled correctly',
        'Check your internet connection',
        'If the problem persists, contact support at support@career-9.com'
      ],
      canRetry: true
    },
    'registration-failed-cleanup-failed': {
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
    },
    'payment-system-error': {
      title: 'Payment System Error',
      message: 'We couldn\'t load the payment system. This might be due to network restrictions or browser settings.',
      nextSteps: [
        'Check if your browser is blocking scripts',
        'Try disabling browser extensions temporarily',
        'Use a different browser or device',
        'Contact support at support@career-9.com for assistance'
      ],
      canRetry: true
    },
    'payment-setup-failed': {
      title: 'Payment Setup Failed',
      message: 'We couldn\'t set up your payment. This might be a temporary issue with our payment processor.',
      nextSteps: [
        'Wait a few moments and try again',
        'Check your internet connection',
        'Make sure you have sufficient funds in your account',
        'Contact support at support@career-9.com if the problem continues'
      ],
      canRetry: true
    },
    'payment-success-account-failed': {
      title: 'Registration Error',
      message: 'Your payment was successful, but we encountered an error while creating your account. Your payment has been processed, but your account was not created.',
      nextSteps: [
        'Your payment has been processed successfully',
        'Please contact support at support@career-9.com immediately',
        'We will create your account manually and ensure you get access',
        'Include your email address and payment reference number'
      ],
      canRetry: false
    },
    'unexpected-error': {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred during registration. Please try again.',
      nextSteps: [
        'Check your internet connection',
        'Try refreshing the page and registering again',
        'Make sure all required fields are filled correctly',
        'Contact support at support@career-9.com if the problem persists'
      ],
      canRetry: true
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Message Preview</h1>
          <p className="text-gray-600 mb-6">
            This page shows all possible error states that users might encounter during registration.
            Click on any scenario to see how it appears to users.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(errorScenarios).map(([key, error]) => (
              <button
                key={key}
                onClick={() => setSelectedError(key)}
                className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <h3 className="font-semibold text-gray-800 mb-1">{error.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{error.message}</p>
                <span className="text-xs text-gray-500 mt-2 block">
                  {error.canRetry ? '✓ Can Retry' : '✗ Cannot Retry'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedError && errorScenarios[selectedError as keyof typeof errorScenarios] && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Preview: {errorScenarios[selectedError as keyof typeof errorScenarios].title}</h2>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close Preview
              </button>
            </div>
            <ErrorOverlay
              errorDetails={errorScenarios[selectedError as keyof typeof errorScenarios]}
              onClose={() => setSelectedError(null)}
              onRetry={() => {
                alert('Retry clicked - in real scenario, this would reset the form');
                setSelectedError(null);
              }}
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Testing Instructions</h2>
          <div className="space-y-3 text-blue-800">
            <p><strong>To test these errors in real scenarios:</strong></p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Go to <code className="bg-blue-100 px-2 py-1 rounded">/test-registration</code> page</li>
              <li>Fill out the registration form</li>
              <li>Select an error scenario from the dropdown</li>
              <li>Submit the form to see the error in action</li>
            </ol>
            <p className="mt-4"><strong>Note:</strong> These test pages are for development/testing only and should not be deployed to production.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestErrorsPage;

