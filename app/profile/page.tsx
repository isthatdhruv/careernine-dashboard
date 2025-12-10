'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserData } from '../types';
import { 
  ArrowLeftIcon, 
  UserCircleIcon, 
  AcademicCapIcon, 
  CreditCardIcon
} from '@heroicons/react/24/solid';
import { DEFAULT_TENANT_CONFIG } from '../lib/tenant-config';

const Profile = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantConfig, setTenantConfig] = useState(DEFAULT_TENANT_CONFIG);
  const router = useRouter();

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
          const data = userDoc.data() as UserData;
          setUserData(data);
        } else {
          console.error('No user data found in Firestore.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  useEffect(() => {
    const fetchTenantConfig = async () => {
      try {
        const host = window.location.host;
        const response = await fetch('/api/tenant-config', {
          headers: {
            'x-tenant': host.split('.')[0]
          }
        });
        if (response.ok) {
          const config = await response.json();
          setTenantConfig(config);
        }
      } catch (error) {
        console.error('Error fetching tenant config:', error);
      }
    };
    fetchTenantConfig();
  }, []);

  if (loading || tenantConfig === DEFAULT_TENANT_CONFIG) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-700 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <p className="text-red-500 font-medium">Unable to load user data. Please try logging in again.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Your Profile</h1>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* User Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-6 px-6 sm:px-8">
            <div className="flex items-center">
              <div className="bg-white rounded-full p-2 mr-4">
                <UserCircleIcon className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{userData.personal?.name || 'User'}</h2>
                <p className="text-blue-100">{userData.personal?.email || 'No email'}</p>
              </div>
            </div>
          </div>
          
          {/* Display Mode */}
          <div className="p-6">
            {/* Personal Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Phone</h4>
                  <p className="text-gray-800">{userData.personal?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Date of Birth</h4>
                  <p className="text-gray-800">{userData.personal?.dob || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Gender</h4>
                  <p className="text-gray-800">{userData.personal?.gender || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Educational Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
                Educational Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">School</h4>
                  <p className="text-gray-800">{userData.educational?.school || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">School Type</h4>
                  <p className="text-gray-800">{userData.educational?.schoolType || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Class</h4>
                  <p className="text-gray-800">{userData.educational?.studentClass ? `Class ${userData.educational.studentClass}` : 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Top Scoring Subjects</h4>
                  <p className="text-gray-800">{userData.educational?.topHighScoringSubjects || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Father's Occupation</h4>
                  <p className="text-gray-800">{userData.educational?.fatherOccupation || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Mother's Occupation</h4>
                  <p className="text-gray-800">{userData.educational?.motherOccupation || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Activities</h4>
                  <p className="text-gray-800">{userData.educational?.activities || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">Awards</h4>
                  <p className="text-gray-800">{userData.educational?.awards || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {tenantConfig?.features.enablePayments && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2 text-blue-600" />
                Subscription Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {userData.payment?.selectedPlan === 'assessment+counselling' 
                        ? 'Navigator 360 Mentorship' 
                        : 'Navigator 360 Assessment'}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {userData.payment?.paymentStatus === 'paid' 
                        ? 'Active subscription'
                        : userData.payment?.paymentStatus === 'exempted'
                        ? 'Complimentary access'
                        : 'Payment pending'}
                    </p>
                  </div>
                  {userData.payment?.selectedPlan !== 'assessment+counselling' && (
                    <button 
                      onClick={() => router.push('/upgrade')}
                      className="mt-3 md:mt-0 inline-block py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                      Upgrade to Mentorship
                    </button>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
