'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AlreadySubmitted from '../components/AlreadySubmitted';
import { questionsByClass } from '../data/multipleIntelligenceQuestions';
import Confetti from 'react-confetti';
import CompletionModal from '../components/CompletionModal';
import LoadingSpinner from './LoadingSpinner';

const sectionOrder = [
  '/subjects-of-interest',
  '/values',
  '/ability',
  '/personality',
  '/multiple-intelligence',
  '/career-aspirations',
];

const MultipleIntelligenceForm = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState([]);
  //const [progress, setProgress] = useState('');
  const [progress] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOptionSelected, setIsOptionSelected] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [missingIndexes, setMissingIndexes] = useState<number[]>([]);
  const [userName, setUserName] = useState('');
  const [userClass, setUserClass] = useState<number | null>(null);

  const nextPath = '/career-aspirations'; // Path to the next quiz

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
          const data = userDoc.data();

          // Correctly handle studentClass
          const userClass = data.studentClass || 9; // Default to 9 if not provided
          const classGroup =
            userClass >= 6 && userClass <= 8
              ? '6-8'
              : userClass >= 9 && userClass <= 10
              ? '9-10'
              : '11-12';

          // Fetch relevant questions
          const fetchedQuestions = questionsByClass[classGroup];
          setQuestions(fetchedQuestions);

          // Calculate progress
          const completedQuizzes = Object.values(data.cardsStatus || {}).filter(Boolean).length;
          const totalQuizzes = userClass >= 9 ? 6 : 5;
          // setProgress(`${completedQuizzes} out of ${totalQuizzes} quizzes completed`);

          // Check if already submitted
          if (data.cardsStatus?.multipleIntelligence) {
            setIsSubmitted(true);
            setSubmissionData(data.multipleIntelligenceResponses || []);
            if (completedQuizzes === totalQuizzes) setIsCompleted(true);
          } else {
            const savedResponses = data.multipleIntelligenceResponses || Array(fetchedQuestions.length).fill({});
            setResponses(savedResponses);

            // Pre-select option if already answered
            const hasAnswer = savedResponses[currentQuestionIndex]?.selectedOption;
            setIsOptionSelected(!!hasAnswer);
          }

          setUserName(data.userName || '');
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
  }, [router, currentQuestionIndex]);

  const saveResponse = async (updatedResponses) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        multipleIntelligenceResponses: updatedResponses,
      });
    } catch (error) {
      console.error('Error autosaving response:', error);
    }
  };

  const handleOptionSelect = (index, selectedOption, points, intelligenceType) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = {
      question: questions[index].question,
      selectedOption,
      points,
      intelligenceType,
    };
    setResponses(updatedResponses);
    setIsOptionSelected(true);

    saveResponse(updatedResponses); // Autosave response
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setIsOptionSelected(!!responses[currentQuestionIndex + 1]?.selectedOption); // Pre-select for next question
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setIsOptionSelected(!!responses[currentQuestionIndex - 1]?.selectedOption); // Pre-select for previous question
    }
  };

  const handleAllQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find any unanswered questions
    const unanswered = questions.map((_, index) => 
      !responses[index]?.selectedOption ? index : -1
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
      
      const intelligenceScores = responses.reduce((acc, res) => {
        if (res.intelligenceType && res.points) {
          acc[res.intelligenceType] = (acc[res.intelligenceType] || 0) + res.points;
        }
        return acc;
      }, {});
      
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        'cardsStatus.multipleIntelligence': true,
        multipleIntelligenceScores: intelligenceScores,
        multipleIntelligenceResponses: responses,
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
    const sectionIdx = 4; // This is Section E
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
        title="Section E"
        nextPath={nextPathForCompletion}
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  if (isSubmitted) {
    return (
      <AlreadySubmitted
        title="Section E"
        submissions={submissionData}
        progress={progress}
        isCompleted={isCompleted}
        nextPath="/dashboard"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Section E</h1>
      <p className="text-gray-600 mb-6">
        Carefully read each statement reflecting various dimensions of intelligence. For each, select the response that most accurately represents your personal perspective:
        <strong> Strongly Agree, Agree, Disagree,</strong> or <strong>Strongly Disagree.</strong>
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
                  : responses[index]?.selectedOption
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
              }`}
            >
              <h3 className="font-medium text-gray-800 text-lg mb-3">
                {index + 1}. {question.question}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {question.options.map((option, optionIndex) => (
                  <label 
                    key={optionIndex}
                    className={`flex items-center p-3 border rounded cursor-pointer transition ${
                      responses[index]?.selectedOption === option
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={option}
                      checked={responses[index]?.selectedOption === option}
                      onChange={() => {
                        const newResponses = [...responses];
                        newResponses[index] = {
                          question: question.question,
                          selectedOption: option,
                          points: question.scores[optionIndex],
                          intelligenceType: question.intelligenceType,
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

export default MultipleIntelligenceForm;
