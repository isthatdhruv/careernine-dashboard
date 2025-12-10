'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AlreadySubmitted from '../components/AlreadySubmitted';
import CompletionModal from '../components/CompletionModal';
import { questions } from '../data/abilityQuestions';

const sectionOrder = [
  '/subjects-of-interest',
  '/values',
  '/ability',
  '/personality',
  '/multiple-intelligence',
  '/career-aspirations',
];

const AbilityForm = () => {
  const router = useRouter();
  const [responses, setResponses] = useState(
    Array(questions.length).fill({ question: '', selectedOption: '', points: 0, ability: '' })
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState([]);
  const [progress] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOptionSelected, setIsOptionSelected] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [userName, setUserName] = useState('');
  const [missingIndexes, setMissingIndexes] = useState<number[]>([]);
  const [userClass, setUserClass] = useState<number | null>(null);

  const fetchUserData = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        // Set user name
        if (data.personal?.name) {
          setUserName(data.personal.name);
        }

        // Use studentClass to calculate total quizzes
        const userClass = data.studentClass || 9; // Default to 9 if undefined
        const totalQuizzes = userClass >= 9 ? 6 : 5;

        // Calculate progress dynamically
        const completedQuizzes = Object.values(data.cardsStatus || {}).filter(Boolean).length;

        // Check if quiz is already submitted
        if (data.cardsStatus?.ability) {
          setIsSubmitted(true);
          setSubmissionData(data.abilityDetailedResponses || []);
          if (completedQuizzes === totalQuizzes) setIsCompleted(true);
        } else {
          // Load previously saved responses
          const savedResponses = data.abilityDetailedResponses || responses;
          setResponses(savedResponses);

          // Pre-select option if already answered
          const hasAnswer = savedResponses[0]?.selectedOption;
          setIsOptionSelected(!!hasAnswer);
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
  }, [router, responses]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const saveResponse = async (updatedResponses) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        abilityDetailedResponses: updatedResponses,
      });
    } catch (error) {
      console.error('Error autosaving response:', error);
    }
  };

  const handleAllQuestionsSubmit = async (e) => {
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
      
      const abilityScores = responses.reduce((acc, res) => {
        if (res.ability && res.points) {
          acc[res.ability] = (acc[res.ability] || 0) + res.points;
        }
        return acc;
      }, {});
      
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        'cardsStatus.ability': true,
        abilityScores,
        abilityDetailedResponses: responses,
      });
      
      setShowCelebration(true);
      setLoading(false);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('An error occurred while saving your answers. Please try again.');
      setLoading(false);
    }
  };

  // Determine nextPath for CompletionModal
  let nextPathForCompletion = '/dashboard';
  if (userClass !== null) {
    const isClass9Plus = userClass >= 9;
    const sectionIdx = 2; // This is Section C
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
        title="Section C"
        nextPath={nextPathForCompletion}
        userName={userName}
        autoRedirect={true}
      />
    );
  }

  if (isSubmitted) {
    return (
      <AlreadySubmitted
        title="Section C"
        submissions={submissionData.map((resp) => `${resp.question}: ${resp.selectedOption}`)}
        progress={progress}
        isCompleted={isCompleted}
        nextPath="/dashboard"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Section C</h2>
      <p className="text-gray-600 mb-6">
        <strong>Ability</strong> refers to the talent, skill, or capacity to perform a task effectively. Below, you'll find a list of abilities, each with a brief description and a set of related questions. For each question, choose the option that best reflects your current level of ability.
      </p>
      <form
        onSubmit={handleAllQuestionsSubmit}
      >
        <div className="space-y-8">
          {questions.map((q, qIdx) => (
            <div 
              key={qIdx}
              id={`question-${qIdx}`}
              className={`p-5 border rounded-lg ${
                missingIndexes.includes(qIdx) 
                  ? 'border-red-500 bg-red-50' 
                  : responses[qIdx]?.selectedOption
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
              }`}
            >
              <h3 className="font-medium text-gray-800 text-lg mb-3">
                {qIdx + 1}. {q.question}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {q.options.map((option, oIdx) => (
                  <label 
                    key={oIdx}
                    className={`flex items-center p-3 border rounded cursor-pointer transition ${
                      responses[qIdx]?.selectedOption === option.text
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${qIdx}`}
                      value={option.text}
                      checked={responses[qIdx]?.selectedOption === option.text}
                      onChange={() => {
                        const updatedResponses = [...responses];
                        updatedResponses[qIdx] = {
                          question: q.question,
                          selectedOption: option.text,
                          points: option.points,
                          ability: q.ability,
                        };
                        setResponses(updatedResponses);
                        
                        // Remove from missing indexes if it was there
                        if (missingIndexes.includes(qIdx)) {
                          setMissingIndexes(missingIndexes.filter(i => i !== qIdx));
                        }
                        
                        // Autosave
                        saveResponse(updatedResponses);
                      }}
                      className="h-4 w-4 text-blue-600 mr-3"
                    />
                    {option.text}
                  </label>
                ))}
              </div>
              
              {missingIndexes.includes(qIdx) && (
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

export default AbilityForm;
