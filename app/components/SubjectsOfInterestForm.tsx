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

const SubjectsOfInterestForm = () => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [progress] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const [missingSubmission, setMissingSubmission] = useState(false);
  const [userClass, setUserClass] = useState<number | null>(null);

  const subjects = [
    { name: 'Agriculture', info: 'Study of farming, crops, livestock, and food production.' },
    { name: 'Art', info: 'Creative expression through painting, drawing, sculpture, and design.' },
    { name: 'Cultural Studies', info: 'Understanding societies, cultures, and their histories.' },
    { name: 'English', info: 'Language skills, literature, and communication.' },
    { name: 'Finance', info: 'Money management, banking, investing, and economics.' },
    { name: 'Health', info: 'Physical and mental well-being, nutrition, and healthcare.' },
    { name: 'Home and Consumer Science', info: 'Cooking, budgeting, and daily life skills.' },
    { name: 'Languages', info: 'Learning regional and foreign languages.' },
    { name: 'Management', info: 'Leadership, planning, and organizational skills.' },
    { name: 'Mathematics', info: 'Numbers, logic, problem-solving, and analysis.' },
    { name: 'Music', info: 'Singing, instruments, music theory, and performance.' },
    { name: 'Science', info: 'Biology, chemistry, physics, and experiments.' },
    { name: 'Social Sciences', info: 'History, geography, politics, and society.' },
    { name: 'Technology', info: 'Computers, programming, AI, and modern tech.' },
    { name: 'Vocational Studies', info: 'Skill-based practical training in trades and careers.' },
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
          if (data.personal?.name) {
            setUserName(data.personal.name);
          }
          if (data.educational?.studentClass) {
            setUserClass(Number(data.educational.studentClass));
          }
          if (data.cardsStatus?.subjectsOfInterest) {
            setSelectedSubjects(data.subjectsOfInterest || []);
            setIsSubmitted(true);
          } else if (data.subjectsOfInterest) {
            setSelectedSubjects(data.subjectsOfInterest);
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

  const saveResponse = async (updatedSubjects: string[]) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        subjectsOfInterest: updatedSubjects,
      });
    } catch (error) {
      console.error('Error autosaving subjects:', error);
    }
  };

  const toggleSubject = (subject: string) => {
    const updatedSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((s) => s !== subject)
      : selectedSubjects.length < 5
      ? [...selectedSubjects, subject]
      : selectedSubjects;

    setSelectedSubjects(updatedSubjects);
    saveResponse(updatedSubjects);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubjects.length < 5) {
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
        'cardsStatus.subjectsOfInterest': true,
        subjectsOfInterest: selectedSubjects,
      });
      
      setShowCompletionModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error saving data:', error);
      setLoading(false);
    }
  };

  // Determine nextPath for CompletionModal
  let nextPath = '/dashboard';
  if (userClass !== null) {
    const isClass9Plus = userClass >= 9;
    const sectionIdx = 0; // This is Section A
    const lastSectionIdx = isClass9Plus ? 5 : 4;
    if (sectionIdx < lastSectionIdx) {
      nextPath = sectionOrder[sectionIdx + 1];
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
        title="Section A"
        submissions={selectedSubjects}
        progress={progress}
        isCompleted={progress === '6 out of 6 quizzes completed'}
        nextPath="/dashboard"
      />
    );
  }

  if (showCompletionModal) {
    return (
      <CompletionModal
        title="Section A"
        nextPath={nextPath}
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Section A</h1>
      <p className="text-gray-600 mb-6">
        Select up to <strong>5 subjects</strong> that interest you the most. Your selections will help us understand your academic preferences.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="p-5 border rounded-lg mb-6 border-gray-200">
          <h3 className="font-medium text-gray-800 text-lg mb-4">
            Select 5 subjects that interest you the most:
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map(({ name, info }, index) => (
              <div key={index} className="relative">
                <div
                  className={`p-4 flex justify-between items-center border rounded cursor-pointer transition ${
                    selectedSubjects.includes(name)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  onClick={() => toggleSubject(name)}
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
          
          {missingSubmission && selectedSubjects.length < 5 && (
            <p className="text-red-600 text-sm mt-4">Please select 5 subjects before submitting.</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-gray-600">
            {selectedSubjects.length}/5 subjects selected
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

export default SubjectsOfInterestForm;
