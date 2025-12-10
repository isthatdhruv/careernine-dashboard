'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AlreadySubmitted from '../components/AlreadySubmitted';
import { questionsByClass } from '../data/personalityQuestions';
import Confetti from 'react-confetti';
import CompletionModal from '../components/CompletionModal';

type Question = {
  question: string;
  domain: string;
  scores: number[];
  options: string[];
};

type Response = {
  question: string;
  answer: string;
  points: number;
  domain: string;
};

type UserDocData = {
  cardsStatus?: { [key: string]: boolean };
  studentClass?: number;
  personalityDetailedResponses?: Response[];
  educational?: {
    studentClass?: string;
  };
};

const sectionOrder = [
  '/subjects-of-interest',
  '/values',
  '/ability',
  '/personality',
  '/multiple-intelligence',
  '/career-aspirations',
];

const PersonalityForm = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // const [progress, setProgress] = useState('');
  const [progress] = useState('');
  const [submissionData, setSubmissionData] = useState<Response[]>([]);
  const [isOptionSelected, setIsOptionSelected] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [missingIndexes, setMissingIndexes] = useState<number[]>([]);
  const [userName, setUserName] = useState('');
  const [userClass, setUserClass] = useState<number | null>(null);

  const nextPath = '/multiple-intelligence';

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserDocData;

          const userClass = data.studentClass || 9; // Default to 9 if not provided
          const classGroup = userClass <= 8 ? '6-8' : '9-12';
          setQuestions(questionsByClass[classGroup]);

          if (data.personalityDetailedResponses) {
            setResponses(data.personalityDetailedResponses);
            const lastUnansweredIndex = data.personalityDetailedResponses.findIndex(
              (resp) => !resp.answer
            );
            setCurrentQuestionIndex(
              lastUnansweredIndex === -1 ? questionsByClass[classGroup].length - 1 : lastUnansweredIndex
            );
            setIsOptionSelected(
              !!data.personalityDetailedResponses[lastUnansweredIndex]?.answer
            );
          } else {
            setResponses(
              Array(questionsByClass[classGroup].length).fill({
                question: '',
                answer: '',
                points: 0,
                domain: '',
              })
            );
          }

          if (data.cardsStatus?.personality) {
            setIsSubmitted(true);
            setSubmissionData(data.personalityDetailedResponses || []);
          }

          setUserName(user.displayName || 'Student');
          if (data.educational?.studentClass) {
            setUserClass(Number(data.educational.studentClass));
          }
        //  const completedQuizzes = Object.values(data.cardsStatus || {}).filter(Boolean).length;
        //  const totalQuizzes = userClass >= 9 ? 6 : 5;
        //  setProgress(`${completedQuizzes} out of ${totalQuizzes} quizzes completed`);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const saveResponse = async (updatedResponses: Response[]) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        personalityDetailedResponses: updatedResponses,
      });
    } catch (error) {
      console.error('Error autosaving response:', error);
    }
  };

  const handleOptionSelect = (answer: string, points: number, domain: string, question: string) => {
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = { question, domain, answer, points };
    setResponses(updatedResponses);
    setIsOptionSelected(true);

    saveResponse(updatedResponses);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setIsOptionSelected(!!responses[currentQuestionIndex + 1]?.answer);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setIsOptionSelected(!!responses[currentQuestionIndex - 1]?.answer);
    }
  };

  const handleAllQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find any unanswered questions
    const unanswered = questions.map((_, index) => 
      !responses[index]?.answer ? index : -1
    ).filter(index => index !== -1);
    
    setMissingIndexes(unanswered);
    
    if (unanswered.length > 0) {
      // Scroll to the first unanswered question
      const firstUnanswered = document.getElementById(`question-${unanswered[0]}`);
      if (firstUnanswered) {
        firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // All questions answered, proceed with submission
    try {
      setLoading(true);
      
      const domainScores = responses.reduce((acc: Record<string, number>, res) => {
        if (res.domain && res.points) {
          acc[res.domain] = (acc[res.domain] || 0) + res.points;
        }
        return acc;
      }, {});
      
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        'cardsStatus.personality': true,
        personalityScores: domainScores,
        personalityDetailedResponses: responses,
      });
      
      setShowCelebration(true);
      
      // Delay navigation to show the celebration
      setTimeout(() => {
        router.push(nextPath);
      }, 5000);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('An error occurred while saving your answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine nextPath for CompletionModal
  let nextPathForCompletion = '/dashboard';
  if (userClass !== null) {
    const isClass9Plus = userClass >= 9;
    const sectionIdx = 3; // This is Section D
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

  if (showCelebration) {
    return (
      <CompletionModal
        title="Section D"
        nextPath={nextPathForCompletion}
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  if (isSubmitted) {
    return (
      <AlreadySubmitted
        title="Section D"
        submissions={submissionData}
        progress={progress}
        isCompleted={false}
        nextPath="/dashboard"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Section D</h1>
      <p className="text-gray-600 mb-6">
        Below are several statements about your interests. For each one, select <strong>"Yes"</strong> if it describes you, or <strong>"No"</strong> if it does not. There are no right or wrong answers—just go with what feels true for you. Think about what genuinely interests you, even if you haven't had the opportunity to try it yet.
      </p>
      
      <form onSubmit={handleAllQuestionsSubmit}>
        <div className="space-y-8">
          {questions.map((question, index) => (
            <div 
              key={index}
              id={`question-${index}`}
              className={`p-5 border rounded-lg ${
                missingIndexes.includes(index) 
                  ? 'border-red-500 bg-red-50' 
                  : responses[index]?.answer
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
              }`}
            >
              <h3 className="font-medium text-gray-800 text-lg mb-3">
                {index + 1}. {question.question}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((option, optionIndex) => (
                  <label 
                    key={optionIndex}
                    className={`flex items-center p-3 border rounded cursor-pointer transition ${
                      responses[index]?.answer === option
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={option}
                      checked={responses[index]?.answer === option}
                      onChange={() => {
                        const newResponses = [...responses];
                        newResponses[index] = {
                          question: question.question,
                          answer: option,
                          points: question.scores[optionIndex],
                          domain: question.domain
                        };
                        setResponses(newResponses);
                        
                        // Remove from missing indexes if it was there
                        if (missingIndexes.includes(index)) {
                          setMissingIndexes(missingIndexes.filter(i => i !== index));
                        }
                        
                        // Autosave
                        saveResponse(newResponses);
                      }}
                      className="h-4 w-4 text-blue-600 mr-3"
                    />
                    {option}
                  </label>
                ))}
              </div>
              
              {missingIndexes.includes(index) && (
                <p className="text-red-600 text-sm mt-2">Please answer this question</p>
              )}
            </div>
          ))}
        </div>
        
        <button
          type="submit"
          className="mt-8 w-full py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center transition-all"
        >
          Submit All Answers
        </button>
      </form>
    </div>
  );
};

export default PersonalityForm;
