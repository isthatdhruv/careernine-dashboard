import React, { useState, useEffect, useCallback } from 'react';
import Confetti from 'react-confetti';
import { useRouter } from 'next/navigation';

interface CompletionModalProps {
  title: string;
  nextPath: string;
  showConfetti?: boolean;
  onClose?: () => void;
  autoRedirect?: boolean;
  userName?: string;
  allCompleted?: boolean;
}

const CompletionModal: React.FC<CompletionModalProps> = ({ 
  title,
  nextPath,
  showConfetti = true,
  onClose,
  autoRedirect = true,
  userName,
  allCompleted
}) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  
  const handleContinue = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      window.setTimeout(() => {
        router.push(nextPath);
      }, 0);
    }
  }, [onClose, router, nextPath]);
  
  useEffect(() => {
    if (autoRedirect) {
      // Set a timer to actually redirect after 4 seconds
      const redirectTimer = setTimeout(() => {
        handleContinue();
      }, 4000);
      
      // Set a separate timer for the countdown display
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearTimeout(redirectTimer);
        clearInterval(countdownTimer);
      };
    }
  }, [autoRedirect, handleContinue]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      {showConfetti && (
        <Confetti 
          width={window.innerWidth} 
          height={window.innerHeight} 
          recycle={false} 
          numberOfPieces={allCompleted ? 800 : 500} 
        />
      )}
      
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full flex flex-col items-center">
        <div className={`w-20 h-20 ${allCompleted ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mb-4`}>
          <svg className={`w-12 h-12 ${allCompleted ? 'text-yellow-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className={`text-2xl font-bold ${allCompleted ? 'text-yellow-700' : 'text-green-700'} mb-2`}>
          {allCompleted ? 'Amazing! All Sections Completed!' : `${title} Completed!`}
        </h2>
        
        <p className="text-gray-700 text-center mb-2">
          {allCompleted 
            ? `Congratulations ${userName || ''}! You've completed all the assessment sections. Your comprehensive career guidance report is being prepared.`
            : `Great job! You've successfully completed this assessment section. Your responses have been saved and will help us provide a comprehensive assessment.`}
        </p>
        
        {autoRedirect && (
          <p className="text-sm text-blue-600 mb-4">
            You will be redirected to the next section in {countdown} seconds...
          </p>
        )}
        
        <button 
          onClick={handleContinue} 
          className={`px-6 py-2 ${allCompleted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md font-medium transition`}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default CompletionModal; 