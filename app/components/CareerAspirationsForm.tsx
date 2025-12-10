'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AlreadySubmitted from '../components/AlreadySubmitted';
import CompletionModal from '../components/CompletionModal';
import { FiInfo } from 'react-icons/fi';

const CareerAspirationsForm = () => {
  const [selectedAspirations, setSelectedAspirations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState<string[]>([]);
  const [progress] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [missingSubmission, setMissingSubmission] = useState(false);

  const router = useRouter();

  const careerFields = [
    { name: 'Architecture', info: 'Designing and planning buildings and structures.' },
    { name: 'Engineering and Technology', info: 'Applying scientific principles to innovate and solve problems.' },
    { name: 'Information Technology and Allied Fields', info: 'Working with software, hardware, and digital systems.' },
    { name: 'Art, Design', info: 'Visual and creative expression through various media.' },
    { name: 'Entertainment and Mass Media', info: 'Creating and delivering content across platforms.' },
    { name: 'Sports', info: 'Physical competition and athletic performance.' },
    { name: 'Entrepreneurship', info: 'Creating and running your own business or startup.' },
    { name: 'Management and Administration', info: 'Organizing and leading people or projects efficiently.' },
    { name: 'Banking & Finance', info: 'Managing money, investments, and economic activities.' },
    { name: 'Hospitality and Tourism', info: 'Travel, accommodation, and customer experience industries.' },
    { name: 'Community and Social Service', info: 'Helping individuals and communities improve their lives.' },
    { name: 'Social Science/ Humanities', info: 'Studying society, history, politics, and cultures.' },
    { name: 'Education and Training', info: 'Teaching, mentoring, and developing learning systems.' },
    { name: 'Agriculture and Food', info: 'Farming, food science, and sustainable practices.' },
    { name: 'Paramedical', info: 'Support roles in healthcare, like radiology or physiotherapy.' },
    { name: 'Law Studies', info: 'Legal systems, rights, and the justice process.' },
    { name: 'Life Sciences /Medicine and Healthcare', info: 'Biology, medical treatment, and health research.' },
    { name: 'Defense/ Protective Service', info: 'Military, police, and emergency response roles.' },
    { name: 'Personal Care and Services', info: 'Providing grooming, wellness, or lifestyle assistance.' },
    { name: 'Sales', info: 'Selling products or services to customers.' },
    { name: 'Government and Public Administration', info: 'Policy making and governance roles.' },
    { name: 'Science and Mathematics', info: 'Analytical and theoretical exploration of the natural world.' },
    { name: 'Marketing', info: 'Promoting and communicating the value of products or brands.' },
    { name: 'Environmental Service', info: 'Sustainability, conservation, and environmental protection.' },
  ];

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
          
          // Check the user's class and redirect if they're below class 9
          const userClass = Number(data.educational?.studentClass || 0);
          if (userClass < 9) {
            router.push('/dashboard');
            return;
          }
          
          // Continue with existing logic
          const totalQuizzes = userClass >= 9 ? 6 : 5;
          const completedQuizzes = Object.values(data.cardsStatus || {}).filter(Boolean).length;

          if (data.personal?.name) {
            setUserName(data.personal.name);
          }

          if (completedQuizzes === totalQuizzes) setIsCompleted(true);

          if (data.cardsStatus?.careerAspirations) {
            setIsSubmitted(true);
            setSubmissionData(data.careerAspirations || []);
          } else if (data.careerAspirations) {
            setSelectedAspirations(data.careerAspirations);
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

  const saveResponse = async (updatedAspirations: string[]) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        careerAspirations: updatedAspirations,
      });
    } catch (error) {
      console.error('Error autosaving aspirations:', error);
    }
  };

  const toggleAspiration = (field: string) => {
    const updatedAspirations = selectedAspirations.includes(field)
      ? selectedAspirations.filter((f) => f !== field)
      : selectedAspirations.length < 4
      ? [...selectedAspirations, field]
      : selectedAspirations;

    setSelectedAspirations(updatedAspirations);
    saveResponse(updatedAspirations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAspirations.length < 4) {
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
      await updateDoc(doc(db, 'users', user.uid), {
        'cardsStatus.careerAspirations': true,
        careerAspirations: selectedAspirations,
      });
      setShowCompletionModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error saving data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showCompletionModal) {
    return (
      <CompletionModal
        title="Section F"
        nextPath="/dashboard"
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  if (isSubmitted) {
    return (
      <AlreadySubmitted
        title="Section F"
        submissions={submissionData}
        progress={progress}
        isCompleted={isCompleted}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Section F</h2>
      <p className="text-gray-600 mb-6">
        Select <strong>4 career fields</strong> that resonate most with your aspirations. Your selections will help us understand your professional interests for the future.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="p-5 border rounded-lg mb-6 border-gray-200">
          <h3 className="font-medium text-gray-800 text-lg mb-4">
            Select 4 career fields that interest you the most:
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {careerFields.map(({ name, info }, index) => (
              <div key={index} className="relative">
                <div
                  className={`p-4 flex justify-between items-center border rounded cursor-pointer transition ${
                    selectedAspirations.includes(name)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  onClick={() => toggleAspiration(name)}
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
          
          {missingSubmission && selectedAspirations.length < 4 && (
            <p className="text-red-600 text-sm mt-4">Please select 4 career fields before submitting.</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-gray-600">
            {selectedAspirations.length}/4 career fields selected
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

export default CareerAspirationsForm;