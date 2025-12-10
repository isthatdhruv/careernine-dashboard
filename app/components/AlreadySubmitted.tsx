import React from 'react';
import Link from 'next/link';

interface AlreadySubmittedProps {
  title: string;
  progress?: string;
  nextPath?: string;
  submissions?: string[] | any[];
  isCompleted?: boolean;
}

const AlreadySubmitted: React.FC<AlreadySubmittedProps> = ({ 
  title, 
  progress, 
  nextPath = '/dashboard',
  submissions,
  isCompleted 
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full flex flex-col items-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-green-700 mb-2">{title} Already Completed</h2>
      
      <p className="text-gray-700 text-center mb-6">
        You have already completed this section. Your answers have been recorded and will contribute to your personalized assessment.
      </p>
      
      {progress && (
        <div className="mb-6 w-full">
          <p className="text-gray-700 mb-2 text-center">Your overall progress: {progress}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${parseInt(progress) * 100 / 6}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <Link 
        href={nextPath}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition"
      >
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default AlreadySubmitted;
