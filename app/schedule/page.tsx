'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import CalendlyWidget from '@/components/CalendlyWidget';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UserData } from '../types';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SchedulePage = () => {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasAppointment, setHasAppointment] = useState(false);
  const [calendlyMeetings, setCalendlyMeetings] = useState<any[]>([]);
  const router = useRouter();

  // Check if appointment data is valid
  const hasValidAppointment = (data: UserData) => {
    if (!data?.counselingAppointment) return false;
    
    // Check if appointmentURI exists
    if (!data.counselingAppointment.appointmentURI) return false;
    
    // If we have timestamp data, ensure it's recent (within last 7 days)
    if (data.counselingAppointment.scheduledAt) {
      const scheduledTime = data.counselingAppointment.scheduledAt.toDate ? 
        data.counselingAppointment.scheduledAt.toDate() : 
        new Date(data.counselingAppointment.scheduledAt);
      
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      return scheduledTime > sevenDaysAgo;
    }
    
    return true; // If we have URI but no timestamp, assume it's valid
  };

  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        router.replace('/login');
        return;
      }

      const data = userDoc.data() as UserData;
      setUserData(data);
      
      // Check if user already has an appointment in Firestore
      const appointmentExists = hasValidAppointment(data);
      
      // If no appointment in Firestore, check Calendly API for meetings
      if (data.personal?.email) {
        try {
          const response = await fetch('/api/calendly/meetings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: data.personal.email }),
          });
          
          if (response.ok) {
            const result = await response.json();
            setCalendlyMeetings(result.meetings || []);
            
            if (result.hasMeetings) {
              // User has meetings in Calendly
              setHasAppointment(true);
            } else {
              setHasAppointment(appointmentExists);
            }
          } else {
            // If API call fails, fall back to Firestore data
            setHasAppointment(appointmentExists);
          }
        } catch (error) {
          console.error('Error checking Calendly meetings:', error);
          setHasAppointment(appointmentExists);
        }
      } else {
        setHasAppointment(appointmentExists);
      }
      
      const userClass = Number(data.educational?.studentClass || 0);

      // Build validKeys dynamically based on class
      const validKeys = [
        'subjectsOfInterest',
        'values',
        'ability',
        'personality',
        'multipleIntelligence',
      ];
      if (userClass >= 9) {
        validKeys.push('careerAspirations');
      }

      const completed = validKeys.filter((key) => data.cardsStatus && data.cardsStatus[key]).length;

      // Check if user has counselling access and has completed all assessments
      if (completed === validKeys.length && 
          data.payment?.selectedPlan === 'assessment+counselling') {
        setAllowed(true);
      } else {
        setAllowed(false);
      }

      setChecking(false);
    };

    checkAccess();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gray-50">
      {checking ? (
        <LoadingSpinner />
      ) : allowed ? (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
          {hasAppointment ? (
            <div className="bg-white p-8 rounded-lg shadow-md my-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-full mr-3">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  You've Already Scheduled a Session
                </h1>
              </div>
              
              <p className="text-gray-700 mb-6">
                You already have a counseling session scheduled. Check your email for the meeting details.
              </p>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                <h3 className="font-medium text-blue-800 mb-2">Appointment Information</h3>
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-gray-700">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                    {userData?.counselingAppointment?.scheduledAt ? (
                      <span>Scheduled on {userData.counselingAppointment?.scheduledAt?.toDate ? 
                        new Date(userData.counselingAppointment.scheduledAt.toDate()).toLocaleDateString() : 'Pending'}</span>
                    ) : calendlyMeetings.length > 0 ? (
                      <span>Scheduled on {new Date(calendlyMeetings[0].event.start_time).toLocaleDateString()}</span>
                    ) : (
                      <span>Appointment scheduled</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <CalendarIcon className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-semibold text-gray-800">
                    Book Your Counselling Session
                  </h1>
                </div>
                <p className="text-gray-700 mb-4">
                  Select a convenient time for your personalized career counseling session. Our expert will provide tailored guidance based on your assessment results.
                </p>
              </div>
              
              <CalendlyWidget
                url="https://calendly.com/prasad-khake-career-9/30min"
                visible={true}
                prefill={{
                  name: userData?.personal?.name,
                  email: userData?.personal?.email
                }}
              />
            </>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg p-8 max-w-md w-full flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm7-5v2m0 0a2 2 0 11-4 0v-2a2 2 0 114 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-blue-700 mb-2">Almost there!</h2>
            <p className="text-gray-700 text-center mb-4">
              {!userData?.payment || userData?.payment?.selectedPlan !== 'assessment+counselling' ? 
                "You need to upgrade to Navigator 360 Mentorship plan to access counseling sessions." :
                "Complete all assessment sections to unlock scheduling. Please finish all quizzes in your dashboard first."
              }
            </p>
            <button 
              onClick={() => router.replace('/dashboard')} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );  
};

export default SchedulePage;
