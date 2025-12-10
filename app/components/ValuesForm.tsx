'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AlreadySubmitted from '../components/AlreadySubmitted';
import CompletionModal from '../components/CompletionModal';
import { FiInfo } from 'react-icons/fi';

const sectionOrder = [
  '/subjects-of-interest',
  '/values',
  '/ability',
  '/personality',
  '/multiple-intelligence',
  '/career-aspirations',
];

const ValuesForm = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [progress] = useState('');
  const router = useRouter();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [missingSubmission, setMissingSubmission] = useState(false);
  const [userClass, setUserClass] = useState<number | null>(null);

  const values = [
    { id: 1, name: 'Lucrative Salary', info: 'A career that offers high financial rewards and monetary benefits.' },
    { id: 2, name: 'Job Security', info: 'A stable and long-term career path with minimal risk of unemployment.' },
    { id: 3, name: 'Variety and Diversity', info: 'Opportunities to engage in diverse tasks and experiences.' },
    { id: 4, name: 'Building Relations', info: 'Focus on communication, empathy, and human interaction.' },
    { id: 5, name: 'High Achievement', info: 'Pursuit of success, recognition, and significant accomplishments.' },
    { id: 6, name: 'Autonomy', info: 'The ability to work independently and make personal decisions.' },
    { id: 7, name: 'Hands on activities', info: 'Engaging in practical and physical tasks.' },
    { id: 8, name: 'Prestige/Recognition', info: 'Being known, respected, or admired in your profession.' },
    { id: 9, name: 'Creativity', info: 'Opportunities to express original ideas and innovative thinking.' },
    { id: 10, name: 'Mental Activity', info: 'Challenging the mind with critical thinking and problem-solving.' },
    { id: 11, name: 'Physical Activity', info: 'Active, movement-based work rather than sedentary tasks.' },
    { id: 12, name: 'Leadership', info: 'Taking initiative, guiding others, and making decisions.' },
    { id: 13, name: 'Routine Activity', info: 'Consistent and predictable daily tasks.' },
    { id: 14, name: 'Supervised Work', info: 'Working under clear direction and guidance from others.' },
    { id: 15, name: 'Working Conditions', info: 'A comfortable, supportive, and safe work environment.' },
  ];

  const nextPath = '/ability';

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.personal?.name) {
            setUserName(data.personal.name);
          }
          
          if (data.cardsStatus?.values) {
            setSelectedValues(data.values || []);
            setIsSubmitted(true);
          } else if (data.values) {
            setSelectedValues(data.values);
          }

          if (data.educational?.studentClass) {
            setUserClass(Number(data.educational.studentClass));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const saveResponse = async (updatedValues: string[]) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        values: updatedValues,
      });
    } catch (error) {
      console.error('Error autosaving values:', error);
    }
  };

  const toggleValue = (value: string) => {
    const updatedValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : selectedValues.length < 5
      ? [...selectedValues, value]
      : selectedValues;

    setSelectedValues(updatedValues);
    saveResponse(updatedValues);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedValues.length < 5) {
      setMissingSubmission(true);
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        'cardsStatus.values': true,
        values: selectedValues,
      });
      
      setShowCompletionModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error saving data:', error);
      setLoading(false);
    }
  };

  // Determine nextPath for CompletionModal
  let nextPathForCompletion = '/dashboard';
  if (userClass !== null) {
    const isClass9Plus = userClass >= 9;
    const sectionIdx = 1; // This is Section B
    const lastSectionIdx = isClass9Plus ? 5 : 4;
    if (sectionIdx < lastSectionIdx) {
      nextPathForCompletion = sectionOrder[sectionIdx + 1];
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <AlreadySubmitted
        title="Section B"
        submissions={selectedValues}
        progress={progress}
        isCompleted={progress === 'All quizzes completed'}
        nextPath="/dashboard"
      />
    );
  }

  if (showCompletionModal) {
    return (
      <CompletionModal
        title="Section B"
        nextPath={nextPathForCompletion}
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Section B</h1>
      <p className="text-gray-600 mb-6">
        Select up to <strong>5 values</strong> that are most important to you. Your selections will help us understand what you prioritize in your life and career.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="p-5 border rounded-lg mb-6 border-gray-200">
          <h3 className="font-medium text-gray-800 text-lg mb-4">
            Select 5 values that matter most to you:
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {values.map(({ id, name, info }) => (
              <div key={id} className="relative">
                <div
                  className={`p-4 flex justify-between items-center border rounded cursor-pointer transition ${
                    selectedValues.includes(name)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  onClick={() => toggleValue(name)}
                >
                  <span className="font-medium">{name}</span>
                  <div className="relative group">
                    <FiInfo
                      className="text-blue-500 w-5 h-5 cursor-help"
                    />
                    <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {info}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {missingSubmission && selectedValues.length < 5 && (
            <p className="text-red-600 text-sm mt-4">Please select 5 values before submitting.</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-gray-600">
            {selectedValues.length}/5 values selected
          </div>
          <button
            type="submit"
            className="px-8 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default ValuesForm;
