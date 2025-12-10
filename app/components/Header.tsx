'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [allQuizzesCompleted, setAllQuizzesCompleted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        
        // Set user plan
        setUserPlan(data.payment?.selectedPlan || null);
        
        // Check if all quizzes are completed
        const userClass = Number(data.educational?.studentClass || 0);
        const totalQuizzes = userClass >= 9 ? 6 : 5;
        
        const completedQuizzes = Object.keys(data.cardsStatus || {})
          .filter((key) => data.cardsStatus[key])
          .length;
          
        setAllQuizzesCompleted(completedQuizzes === totalQuizzes);
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkStatus();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const renderHeaderItems = () => {
    return (
      <div className="flex items-center space-x-5">
        <Link href="/profile" className="flex items-center text-gray-700 hover:text-blue-600 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Profile</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white text-sm font-medium transition"
        >
          Logout
        </button>
      </div>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="relative">
              <Image
                src="/career-9-logo.png"
                alt="Career Navigator Logo"
                width={180}
                height={90}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold text-gray-800 ml-2">Career Navigator 360</span>
          </Link>
          
          {renderHeaderItems()}
        </div>
      </div>
    </header>
  );
};

export default Header;
