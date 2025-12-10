'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

declare global {
  interface Window {
    Calendly?: any;
  }
}

type CalendlyWidgetProps = {
  url: string;
  visible: boolean;
  prefill?: {
    name?: string;
    email?: string;
  };
};

const CalendlyWidget = ({ url, visible, prefill }: CalendlyWidgetProps) => {
  const calendlyRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  // Load Calendly Script
  useEffect(() => {
    if (!window.Calendly && visible) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else if (window.Calendly) {
      setIsLoaded(true);
    }
  }, [visible]);

  // Initialize widget when script is loaded
  useEffect(() => {
    if (visible && isLoaded && window.Calendly && calendlyRef.current) {
      calendlyRef.current.innerHTML = '';
      window.Calendly.initInlineWidget({
        url,
        parentElement: calendlyRef.current,
        prefill: prefill || {},
        utm: {},
      });

      // Add event listener for appointment scheduling
      const handleCalendlyEvent = (e: any) => {
        if (e.data.event === 'calendly.event_scheduled') {
          const appointmentInfo = e.data.payload;
          setIsScheduled(true);
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 }
          });
          // Start countdown after successful scheduling
          let timer = 5;
          const countdownInterval = setInterval(() => {
            timer -= 1;
            setCountdown(timer);
            if (timer <= 0) {
              clearInterval(countdownInterval);
              router.push('/dashboard');
            }
          }, 1000);
          // Store appointment information in Firestore
          const user = auth.currentUser;
          if (user) {
            updateDoc(doc(db, 'users', user.uid), {
              'counselingAppointment': {
                appointmentURI: appointmentInfo.uri || null,
                scheduledAt: new Date(),
                inviteeURI: appointmentInfo.invitee?.uri || null,
                status: 'scheduled'
              },
              updatedAt: new Date()
            }).then(() => {
              // Appointment saved
            }).catch(err => {
              // Error saving appointment data
            });
          }
        }
      };
      window.addEventListener('message', handleCalendlyEvent);
      return () => {
        window.removeEventListener('message', handleCalendlyEvent);
      };
    }
  }, [visible, url, isLoaded, router, prefill]);

  if (!visible) return null;

  if (isScheduled) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Appointment Successfully Scheduled!</h2>
        <p className="text-gray-600 mb-6">
          Your counseling session has been booked. You'll receive an email confirmation with all the details.
        </p>
        <p className="text-blue-600 font-medium">
          Redirecting to dashboard in {countdown} seconds...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-md max-w-4xl mx-auto">
      {!isLoaded && (
        <div className="w-full h-40 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading Calendly...</p>
          </div>
        </div>
      )}
      <div
        ref={calendlyRef}
        style={{ minWidth: '320px', height: '700px' }}
        className={`w-full ${!isLoaded ? 'hidden' : ''}`}
      />
    </div>
  );
};

export default CalendlyWidget;
