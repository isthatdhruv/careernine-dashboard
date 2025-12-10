// app/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { UserData } from '../types';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircleIcon,
  BookOpenIcon,
  HeartIcon,
  LightBulbIcon,
  UserCircleIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CreditCardIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/solid';
import CompletionModal from '../components/CompletionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_PRICING, DEFAULT_PLANS } from '../utils/defaults';
import CalendlyWidget from '../components/CalendlyWidget';

// Define pricing and plan interfaces
interface PricingData {
  assessment: number;
  counselling: number;
}

interface PlanBenefit {
  name: string;
  benefits: string[];
  price: number;
  description: string;
}

interface PlansData {
  assessment: PlanBenefit;
  counselling: PlanBenefit;
}

interface TenantConfig {
  features: {
    enablePayments: boolean;
    enableCalendly: boolean;
  };
  settings: {
    calendlyUrl: string;
  };
  subdomain: string;
}

const Dashboard = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [checking, setChecking] = useState(true);
  const [showPaymentUI, setShowPaymentUI] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [baseAmounts, setBaseAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [discountedAmounts, setDiscountedAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'assessment' | 'assessment+counselling'>('assessment');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [planDetails, setPlanDetails] = useState<PlansData | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedQuizName, setCompletedQuizName] = useState('');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [fetchingAppointment, setFetchingAppointment] = useState(false);
  const [calendlyMeetings, setCalendlyMeetings] = useState<any[]>([]);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);

  // Fetch tenant configuration
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

  // Fetch pricing and plan details
  useEffect(() => {
    const fetchPricingAndPlans = async () => {
      try {
        // Set default values in case fetching fails
        const defaultPricing = DEFAULT_PRICING;
        const defaultPlans = DEFAULT_PLANS;
        
        // Try to fetch pricing
        try {
          const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
          
          if (pricingDoc.exists()) {
            const pricingData = pricingDoc.data() as PricingData;
            setBaseAmounts(pricingData);
            setDiscountedAmounts(pricingData);
            console.log('Pricing loaded from database:', pricingData);
          } else {
            // Use default values if document doesn't exist
            console.log('Using default pricing values');
            setBaseAmounts(defaultPricing);
            setDiscountedAmounts(defaultPricing);
          }
        } catch (error) {
          console.warn('Error fetching pricing, using default values:', error);
          setBaseAmounts(defaultPricing);
          setDiscountedAmounts(defaultPricing);
        }
        
        // Try to fetch plans
        try {
          const plansDoc = await getDoc(doc(db, 'settings', 'plans'));
          
          if (plansDoc.exists()) {
            const plansData = plansDoc.data() as PlansData;
            setPlanDetails(plansData);
            console.log('Plan details loaded from database:', plansData);
          } else {
            // Use default values if document doesn't exist
            console.log('Using default plan details');
            setPlanDetails(defaultPlans);
          }
        } catch (error) {
          console.warn('Error fetching plans, using default values:', error);
          setPlanDetails(defaultPlans);
        }
      } catch (error) {
        console.error('Error in fetchPricingAndPlans:', error);
      }
    };

    fetchPricingAndPlans();
  }, []);

  // Check user access
  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirestore: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let documentFound = false;

    const checkAccess = (user: any) => {
      if (!user) {
        if (isMounted && window.location.pathname !== '/login') {
        router.replace('/login');
        }
        return;
      }

      // Reset document found flag
      documentFound = false;

      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Unsubscribe from previous listener if any
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      // Set a timeout to redirect if document doesn't appear within 15 seconds
      // Increased from 10s to 15s to account for Firestore eventual consistency
      // NOTE: This timeout ONLY triggers for orphaned auth accounts (no Firestore document)
      // Legitimate logged-in users will have their document found immediately, clearing this timeout
      timeoutId = setTimeout(async () => {
        if (isMounted && !documentFound) {
          // Double-check: Try to verify document doesn't exist before signing out
          // This prevents signing out legitimate users experiencing temporary network issues
          try {
            const docSnapshot = await getDoc(doc(db, 'users', user.uid));
            if (docSnapshot.exists()) {
              // Document exists! This was just a slow network response
              // Don't sign out, let the onSnapshot listener handle it
              console.log('Document found on timeout check - was just slow. Not signing out.');
              return;
            }
          } catch (checkError) {
            console.error('Error checking document on timeout:', checkError);
            // If check fails, proceed with sign-out (likely orphaned account)
          }

          console.error('User document not found after 15 seconds for user:', user.uid);
          console.error('This may indicate a registration failure. Signing out user to prevent refresh loop.');
          
          // Sign out the user to prevent refresh loop
          // This happens when auth was created but Firestore document wasn't (orphaned auth account)
          try {
            await signOut(auth);
            console.log('Successfully signed out orphaned auth user');
          } catch (signOutError) {
            console.error('Error signing out user:', signOutError);
          }
          
          // Show a user-friendly error before redirecting
          alert('We couldn\'t find your account information. This indicates your registration didn\'t complete successfully.\n\nYou have been signed out. Please try registering again.\n\nIf the problem persists, contact support@career-9.com');
          
          if (window.location.pathname !== '/login') {
            router.replace('/login');
          }
        }
      }, 15000);

      // Use Firestore listener to wait for document to appear
      // This fires IMMEDIATELY for existing documents (within milliseconds)
      // For legitimate logged-in users, this will fire right away and clear the timeout
      unsubscribeFirestore = onSnapshot(
        doc(db, 'users', user.uid),
        (userDoc) => {
          if (!isMounted) return;

          if (!userDoc.exists()) {
            // Document doesn't exist yet, keep waiting for it to appear
            // Timeout will handle sign-out if it never shows up
            return;
          }

          // Mark document as found - this prevents timeout from triggering
          documentFound = true;

          // Clear timeout since document now exists
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

        const data = userDoc.data() as UserData;

        // Check if this is a return after completing a quiz
        const urlParams = new URLSearchParams(window.location.search);
        const completed = urlParams.get('completed');
        if (completed) {
          // Find the quiz name to display in the modal
          const quizName = getQuizName(completed);
          setCompletedQuizName(quizName);
          setShowCompletionModal(true);
          
          // Clear the query parameter
          window.history.replaceState({}, document.title, "/dashboard");
        }
        
        // Check payment status - instead of redirecting, show payment UI
        if (data.payment && 
            (data.payment.paymentStatus === 'paid' || 
             data.payment.paymentStatus === 'exempted')) {
          setUserData(data);
          setShowPaymentUI(false);
        } else {
          setUserData(data);
          setShowPaymentUI(true);
        }

        setChecking(false);
        },
        (err) => {
          console.error('Error in Firestore listener:', err);
          if (isMounted) {
            setChecking(false);
            // Only redirect on actual errors, not just missing document
            if (err.code !== 'permission-denied' && window.location.pathname !== '/login') {
              router.replace('/login');
            }
          }
        }
      );
    };

    // Use auth state listener to ensure user is ready
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        checkAccess(user);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribeAuth();
    };
  }, []); // Remove router from dependencies - it's stable in Next.js

  // Modify the payment check logic
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!userData) return;

      // Skip payment check for tenants with payments disabled
      if (!tenantConfig?.features.enablePayments) {
        setShowPaymentUI(false);
        return;
      }

      // Original payment check logic
      if (!userData.payment || userData.payment.paymentStatus !== 'paid') {
        setShowPaymentUI(true);
      }
    };

    checkPaymentStatus();
  }, [userData, tenantConfig]);

  // Generate cards based on user's class
  const userClass = Number(userData?.educational?.studentClass || 0);

   const cards = [
    {
      title: 'Section A',
      route: '/subjects-of-interest',
      key: 'subjectsOfInterest',
      icon: <BookOpenIcon className="h-6 w-6 text-gray-600" />,
    },
    {
      title: 'Section B',
      route: '/values',
      key: 'values',
      icon: <HeartIcon className="h-6 w-6 text-gray-600" />,
    },
    {
      title: 'Section C',
      route: '/ability',
      key: 'ability',
      icon: <LightBulbIcon className="h-6 w-6 text-gray-600" />,
    },
    {
      title: 'Section D',
      route: '/personality',
      key: 'personality',
      icon: <UserCircleIcon className="h-6 w-6 text-gray-600" />,
    },
    {
      title: 'Section E',
      route: '/multiple-intelligence',
      key: 'multipleIntelligence',
      icon: <AcademicCapIcon className="h-6 w-6 text-gray-600" />,
    },
  ];

  // Only add Section F for class 9 and above
  if (userClass >= 9) {
    cards.push({
      title: 'Section F',
      route: '/career-aspirations',
      key: 'careerAspirations',
      icon: <BriefcaseIcon className="h-6 w-6 text-gray-600" />,
    });
  }

  const totalQuizzes = cards.length;
  const validKeys = cards.map((card) => card.key);
  const completedQuizzes = Object.keys(userData?.cardsStatus || {})
    .filter((key) => validKeys.includes(key) && userData?.cardsStatus?.[key])
    .length;
  
  const headerTitle =
    userClass >= 11 ? 'Career Navigator' : userClass >= 9 ? 'Stream Navigator' : 'Insight Navigator';

  // Listen for Calendly appointment events
  useEffect(() => {
    if (!userData || !window.Calendly) return;
    
    // Only track if all sections are completed
    if (completedQuizzes !== totalQuizzes) return;
    
    const handleCalendlyEvent = (event: any) => {
      if (event.data.event === 'calendly.event_scheduled') {
        const appointmentInfo = event.data.payload;
        console.log('Calendly appointment scheduled:', appointmentInfo);
        
        // Store appointment information in Firestore
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, 'users', user.uid), {
            'counselingAppointment': {
              appointmentURI: appointmentInfo.uri,
              scheduledAt: new Date(),
              inviteeURI: appointmentInfo.invitee.uri,
              status: 'scheduled'
            }
          }).catch(err => console.error('Error saving appointment data:', err));
        }
      }
    };

    window.addEventListener('message', handleCalendlyEvent);
    
    return () => {
      window.removeEventListener('message', handleCalendlyEvent);
    };
  }, [userData, completedQuizzes, totalQuizzes]);

  // Get quiz name based on route
  const getQuizName = (route: string) => {
    switch(route) {
      case 'subjects-of-interest': return 'Subjects of Interest';
      case 'values': return 'Values Assessment';
      case 'ability': return 'Ability Assessment';
      case 'personality': return 'Personality Assessment';
      case 'multiple-intelligence': return 'Multiple Intelligence Assessment';
      case 'career-aspirations': return 'Career Aspirations';
      default: return 'Assessment Section';
    }
  };

  // Check if appointment data is valid
  const hasValidAppointment = () => {
    if (!userData?.counselingAppointment) return false;
    
    // Check if appointmentURI exists
    if (!userData.counselingAppointment.appointmentURI) return false;
    
    // If we have timestamp data, ensure it's recent (within last 7 days)
    if (userData.counselingAppointment.scheduledAt) {
      const scheduledTime = userData.counselingAppointment.scheduledAt.toDate ? 
        userData.counselingAppointment.scheduledAt.toDate() : 
        new Date(userData.counselingAppointment.scheduledAt);
      
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      return scheduledTime > sevenDaysAgo;
    }
    
    return true; // If we have URI but no timestamp, assume it's valid
  };

  // Fetch appointments from Calendly API
  useEffect(() => {
    const fetchCalendlyMeetings = async () => {
      if (!userData?.personal?.email) return;
      
      try {
        setFetchingAppointment(true);
        
        const response = await fetch('/api/calendly/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userData.personal.email }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setCalendlyMeetings(data.meetings || []);
        }
      } catch (error) {
        console.error("Error fetching Calendly meetings:", error);
      } finally {
        setFetchingAppointment(false);
      }
    };
    
    // If no valid appointment in Firestore, try Calendly
    if (userData && (!hasValidAppointment() || !userData.counselingAppointment)) {
      fetchCalendlyMeetings();
    }
  }, [userData]);

  // Fetch appointment details from Calendly API
  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!userData?.counselingAppointment?.appointmentURI || !hasValidAppointment()) {
        return;
      }

      try {
        setFetchingAppointment(true);
        
        const response = await fetch('/api/calendly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            uri: userData.counselingAppointment.appointmentURI,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setAppointmentDetails(data.data);
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
      } finally {
        setFetchingAppointment(false);
      }
    };
    
    if (userData?.counselingAppointment?.appointmentURI) {
      fetchAppointmentDetails();
    }
  }, [userData]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCouponCheck = async () => {
    if (!couponCode || !userData) return;
    
    setCheckingCoupon(true);
    setCouponMessage('');
    setCouponApplied(false);
    
    try {
      // First check if coupon exists in database
      const couponsRef = collection(db, 'coupons');
      const q = query(couponsRef, where('code', '==', couponCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setCouponMessage('Invalid coupon code');
        setDiscountedAmounts(baseAmounts);
        setCheckingCoupon(false);
        return;
      }
      
      const couponData = querySnapshot.docs[0].data();
      
      // Check if coupon is expired
      if (couponData.expiryDate && new Date(couponData.expiryDate.toDate()) < new Date()) {
        setCouponMessage('This coupon has expired');
        setDiscountedAmounts(baseAmounts);
        setCheckingCoupon(false);
        return;
      }
      
      // Apply discount
      let newPrices = { ...baseAmounts };
      
      if (couponData.discountType === 'percentage') {
        newPrices.assessment = Math.round(baseAmounts.assessment * (1 - couponData.discountValue / 100));
        newPrices.counselling = Math.round(baseAmounts.counselling * (1 - couponData.discountValue / 100));
        setCouponMessage(`${couponData.discountValue}% discount applied!`);
      } else {
        // Fixed amount discount
        newPrices.assessment = Math.max(0, baseAmounts.assessment - couponData.discountValue);
        newPrices.counselling = Math.max(0, baseAmounts.counselling - couponData.discountValue);
        setCouponMessage(`₹${couponData.discountValue / 100} discount applied!`);
      }
      
      setDiscountedAmounts(newPrices);
      setCouponApplied(true);
      
      // Fallback to API-based validation if needed
      if (!couponData) {
        const apiResponse = await fetch('/api/check-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            couponCode,
            email: userData.personal.email
          }),
        });
        
        const data = await apiResponse.json();
        
        if (data.valid) {
          setDiscountedAmounts({
            assessment: data.prices.assessment,
            counselling: data.prices.counselling,
          });
          setCouponApplied(true);
          setCouponMessage(data.message || 'Coupon applied!');
        } else {
          setDiscountedAmounts(baseAmounts);
          setCouponMessage(data.message || 'Invalid coupon code');
        }
      }
    } catch (error) {
      console.error('Error checking coupon:', error);
      setCouponMessage('Error validating coupon');
      setDiscountedAmounts(baseAmounts);
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handlePayment = async (plan: 'assessment' | 'assessment+counselling') => {
    if (!userData) return;
    
    setProcessingPayment(true);
    const amount = plan === 'assessment+counselling' ? 
      discountedAmounts.counselling : discountedAmounts.assessment;

    // Debug: Log all relevant payment variables
    console.log('--- Razorpay Payment Debug ---');
    console.log('Razorpay Key:', process.env.NEXT_PUBLIC_RAZORPAY_KEY);
    console.log('Selected Plan:', plan);
    console.log('Amount:', amount);
    console.log('User Data:', userData);
    console.log('Discounted Amounts:', discountedAmounts);
    console.log('Base Amounts:', baseAmounts);
    console.log('Coupon Applied:', couponApplied);
    console.log('Coupon Code:', couponCode);
    
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load.');
        setProcessingPayment(false);
        return;
      }

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          email: userData.personal.email,
          couponCode: couponApplied ? couponCode : null,
          plan 
        }),
      });

      // Debug: Log order creation response
      console.log('Order creation response:', res);
      const data = await res.json();
      console.log('Order creation response data:', data);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
        amount: data.amount,
        currency: 'INR',
        name: 'Career Navigator',
        description: plan === 'assessment+counselling' ? 'Navigator 360 Mentorship' : 'Navigator 360 Assessment',
        order_id: data.id,
        prefill: {
          name: userData.personal.name,
          email: userData.personal.email,
        },
        handler: async (response: any) => {
          console.log('Razorpay payment handler called with response:', response);
          setProcessingPayment(true);
          try {
            // Update the user record directly with payment info
            const user = auth.currentUser;
            if (user) {
              console.log('Updating user payment in Firestore...');
              await updateDoc(doc(db, 'users', user.uid), {
                'payment': {
                  paymentStatus: 'paid',
                  selectedPlan: plan,
                  amount: data.amount,
                  couponCode: couponApplied ? couponCode : null,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  createdAt: new Date()
                },
                updatedAt: new Date()
              });
              
              // Record the payment in a separate collection for tracking
              const paymentRef = collection(db, 'payments');
              await addDoc(paymentRef, {
                userId: user.uid,
                userName: userData.personal.name,
                userEmail: userData.personal.email,
                plan: plan,
                originalAmount: plan === 'assessment+counselling' ? baseAmounts.counselling : baseAmounts.assessment,
                discountedAmount: amount,
                couponCode: couponApplied ? couponCode : null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                createdAt: new Date()
              });
              
              // Refresh user data
              console.log('User payment updated, refreshing user data...');
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                setUserData(userDoc.data() as UserData);
                setShowPaymentUI(false);
              }
            }
            
            // Show success notification element instead of alert
            const successElement = document.createElement('div');
            successElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
            successElement.innerHTML = `
              <div class="bg-white p-6 rounded-lg shadow-xl max-w-md mx-auto text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-medium text-gray-900 mb-2">Payment Successful!</h3>
                <p class="text-gray-600 mb-4">Your payment has been processed successfully.</p>
              </div>
            `;
            document.body.appendChild(successElement);
            
            // Remove the success notification after 3 seconds
            setTimeout(() => {
              document.body.removeChild(successElement);
            }, 3000);
            console.log('Payment success flow complete.');
          } catch (error) {
            console.error('Payment update error:', error);
            alert('Payment was successful but we had trouble updating your account. Please refresh the page or contact support.');
          } finally {
            setProcessingPayment(false);
          }
        },
        theme: { color: '#0045FF' },
      };

      // Debug: Log Razorpay options before opening modal
      console.log('Opening Razorpay modal with options:', options);
      const razor = new (window as any).Razorpay(options);
      razor.open();
      console.log('Razorpay modal opened');
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred while setting up the payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleUpgradePayment = async () => {
    if (!userData) return;
    
    setProcessingPayment(true);
    // Calculate upgrade amount (difference between counselling and assessment)
    const amount = discountedAmounts.counselling - discountedAmounts.assessment;

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load.');
        setProcessingPayment(false);
        return;
      }

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          email: userData.personal.email,
          couponCode: couponApplied ? couponCode : (userData.payment?.couponCode || null),
          plan: 'upgrade-to-counselling',
          isUpgrade: true,
          originalPlan: 'assessment'
        }),
      });

      const data = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
        amount: data.amount,
        currency: 'INR',
        name: 'Career Navigator',
        description: 'Upgrade to Navigator 360 Mentorship',
        order_id: data.id,
        prefill: {
          name: userData.personal.name,
          email: userData.personal.email,
        },
        handler: async (response: any) => {
          setProcessingPayment(true);
          try {
            // Update the user record with new plan info
            const user = auth.currentUser;
            if (user) {
              // Keep track of the previous payment details for reference
              const previousPayment = { ...userData.payment };
              
              await updateDoc(doc(db, 'users', user.uid), {
                'payment': {
                  paymentStatus: 'paid',
                  selectedPlan: 'assessment+counselling',
                  amount: data.amount,
                  previousPayment,
                  couponCode: couponApplied ? couponCode : (userData.payment?.couponCode || null),
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  createdAt: new Date(),
                  isUpgrade: true
                },
                updatedAt: new Date()
              });
              
              // Record the upgrade payment in payments collection
              const paymentRef = collection(db, 'payments');
              await addDoc(paymentRef, {
                userId: user.uid,
                userName: userData.personal.name,
                userEmail: userData.personal.email,
                plan: 'assessment+counselling',
                originalAmount: discountedAmounts.counselling - discountedAmounts.assessment,
                discountedAmount: amount,
                couponCode: couponApplied ? couponCode : (userData.payment?.couponCode || null),
                previousPlan: 'assessment',
                previousPaymentId: userData.payment?.razorpay_payment_id,
                isUpgrade: true,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                createdAt: new Date()
              });
              
              // Refresh user data
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                setUserData(userDoc.data() as UserData);
              }
            }
            
            // Show success notification
            const successElement = document.createElement('div');
            successElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
            successElement.innerHTML = `
              <div class="bg-white p-6 rounded-lg shadow-xl max-w-md mx-auto text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-medium text-gray-900 mb-2">Upgrade Successful!</h3>
                <p class="text-gray-600 mb-4">You've been upgraded to Navigator 360 Mentorship. You can now schedule personalized counseling sessions.</p>
              </div>
            `;
            document.body.appendChild(successElement);
            
            // Remove the success notification after 3 seconds
            setTimeout(() => {
              document.body.removeChild(successElement);
            }, 3000);
          } catch (error) {
            console.error('Payment update error:', error);
            alert('Payment was successful but we had trouble updating your account. Please refresh the page or contact support.');
          } finally {
            setProcessingPayment(false);
          }
        },
        theme: { color: '#0045FF' },
      };

      const razor = new (window as any).Razorpay(options);
      razor.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred while setting up the payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (checking) {
    return <LoadingSpinner />;
  }

  if (!userData) {
    return <LoadingSpinner />;
  }

  if (showPaymentUI && tenantConfig?.features.enablePayments) {
    const formatPrice = (amount: number) => {
      return `₹${(amount / 100).toFixed(2)}`;
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden relative">
          <div className="bg-blue-50 p-5 border-b border-blue-100">
            <h2 className="text-2xl font-bold text-gray-800">Complete Your Payment</h2>
            <p className="text-blue-800 mt-1">
              Hello, <span className="font-semibold">{userData.personal.name}</span> — please complete your payment to access the dashboard.
            </p>
          </div>
          <div className="p-6">
            {/* Plan Buttons */}
            <div className="space-y-4">
              <div 
                onClick={() => setSelectedPlan('assessment')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === 'assessment'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">Navigator 360 Assessment</h3>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      {planDetails?.assessment.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      )) || (
                        <>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Intelligence Based Learning Styles</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Customised Personality Development Suggestion</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Career Exploration</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-700">{formatPrice(discountedAmounts.assessment)}</p>
                    {discountedAmounts.assessment !== baseAmounts.assessment && (
                      <p className="text-sm text-gray-500 line-through">{formatPrice(baseAmounts.assessment)}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setSelectedPlan('assessment+counselling')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === 'assessment+counselling'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">Navigator 360 Mentorship</h3>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      {planDetails?.counselling.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      )) || (
                        <>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Navigator 360 Assessment & Personalized 1:1 Counselling Sessions</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Deep-Dive Strategy Sessions</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <span>Custom Growth Roadmap</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-700">{formatPrice(discountedAmounts.counselling)}</p>
                    {discountedAmounts.counselling !== baseAmounts.counselling && (
                      <p className="text-sm text-gray-500 line-through">{formatPrice(baseAmounts.counselling)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coupon Code Section */}
            <div className="mt-6">
              <label className="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                <TagIcon className="h-4 w-4 mr-1" />
                Have a coupon code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none transition-all"
                />
                <button
                  onClick={handleCouponCheck}
                  disabled={!couponCode || checkingCoupon}
                  className={`px-4 py-2 rounded-md text-white font-medium transition-all ${
                    !couponCode || checkingCoupon
                      ? 'bg-gray-400 cursor-not-allowed'
                      : couponApplied
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {checkingCoupon ? 'Checking...' : couponApplied ? 'Applied!' : 'Apply'}
                </button>
              </div>
              {couponApplied && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {couponMessage || 'Coupon applied successfully!'}
                </p>
              )}
              {!couponApplied && couponMessage && (
                <p className="mt-2 text-sm text-red-600">
                  {couponMessage}
                </p>
              )}
            </div>
            
            {/* Payment Button */}
            <button
              onClick={() => handlePayment(selectedPlan)}
              disabled={processingPayment}
              className={`mt-6 w-full py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center transition-all ${processingPayment ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {processingPayment ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Pay {selectedPlan === 'assessment' 
                    ? formatPrice(discountedAmounts.assessment) 
                    : formatPrice(discountedAmounts.counselling)}
                </>
              )}
            </button>
            
            <p className="mt-4 text-xs text-gray-500 text-center">
              Secure payment processed by Razorpay. Your information is encrypted and secure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCardClick = (route: string) => {
    setShowCompletionModal(false);
    setCompletedQuizName('');
    setChecking(true);
    setTimeout(() => {
      router.push(route);
    }, 300); // optional delay for smoother UI
  };

  // Add null check for personal data
  const userName = userData?.personal?.name || 'Student';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Intro Message */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            Dear {userName},
          </h2>
          {completedQuizzes === totalQuizzes ? (
          <>
            <p className="text-gray-700 mt-4 mb-6 relative pl-12 border-l-4 border-blue-500 py-3 bg-blue-50 rounded-r-md pr-6">
              <span className="absolute left-3 top-3 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </span>
              <span className="font-medium text-blue-800">Congratulations on completing all assessment sections!</span> Your comprehensive career guidance report is being prepared and will be sent to your registered email within 5-7 working days. This personalized analysis will provide clear insights into your strengths, interests, and potential career paths aligned with your abilities.
            </p>
            
            {userData.payment?.selectedPlan === 'assessment+counselling' && tenantConfig?.features.enableCalendly ? (
              <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                <h3 className="font-medium text-blue-800">Your Mentorship Session</h3>
                <p className="text-blue-700 mt-1">
                  As part of your Navigator 360 Mentorship package, you're entitled to personalized counseling sessions.
                </p>
                {hasValidAppointment() || calendlyMeetings.length > 0 ? (
                  <div className="mt-3 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex items-start">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <CalendarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-700 mb-1">Your Upcoming Appointment</h4>
                        <p className="text-gray-700 text-sm mb-2">
                          You have a scheduled counseling session. Check your email for appointment details.
                        </p>
                        {fetchingAppointment ? (
                          <div className="flex justify-center py-2">
                            <LoadingSpinner fullScreen={false} />
                          </div>
                        ) : (
                          <div className="flex items-center mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="text-gray-800 font-medium">
                              {appointmentDetails ? 
                                new Date(appointmentDetails.data.start_time).toLocaleString('en-US', {
                                  weekday: 'long',
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 
                                calendlyMeetings.length > 0 ?
                                  new Date(calendlyMeetings[0].event.start_time).toLocaleString('en-US', {
                                    weekday: 'long',
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  }) :
                                  (userData?.counselingAppointment?.scheduledAt?.toDate ? 
                                    new Date(userData.counselingAppointment.scheduledAt.toDate()).toLocaleDateString() + ' (Time not specified)' : 
                                    'Appointment scheduled - Check email for details')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      onClick={() => router.push('/schedule')}
                      className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                  >
                    Schedule Your Session Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              tenantConfig?.features.enablePayments && userData.payment?.selectedPlan === 'assessment' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 shadow-sm mt-8">
                <h3 className="font-medium text-blue-800">Upgrade to Navigator 360 Mentorship</h3>
                  <p className="text-gray-600 mt-1">
                  Take your career guidance to the next level with personalized 1:1 counseling sessions from our expert mentors.
                </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• Deep-dive strategy sessions to clarify your career path</li>
                    <li>• Customized growth roadmap based on your assessment results</li>
                    <li>• Expert advice on education and career opportunities</li>
                  </ul>
                <button 
                    onClick={handleUpgradePayment}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upgrade to Mentorship
                </button>
              </div>
              )
            )}
          </>
          ) : (
            <>
              <p className="text-gray-700 mt-3">
              Please read each statement carefully and take your time to understand it before
              answering. It is important to respond honestly, as there are no right or wrong
              answers, and your genuine responses are crucial for accurate results. It is
              recommended to complete the entire questionnaire in one sitting to maintain
              consistency. Once you have completed all the questions, ensure you submit your
              responses as instructed. Your personalized report, which will provide detailed insights and guidance, will be sent
              to your registered email within 5 to 7 working days. Keep an eye on your inbox for
              this valuable resource to help you plan your career path effectively.
              </p>
              
              {userData.payment?.selectedPlan === 'assessment+counselling' ? (
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                  <h3 className="font-medium text-blue-800">Your Mentorship Access</h3>
                  <p className="text-blue-700 mt-1">
                    <span className="font-semibold">Complete all assessment sections</span> to unlock your Navigator 360 Mentorship sessions. 
                    Our expert counselors will provide personalized guidance based on your comprehensive assessment results.
                  </p>
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                    Progress: {completedQuizzes}/{totalQuizzes} sections completed
                  </div>
                </div>
              ) : (
                tenantConfig?.features.enablePayments && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                  <h3 className="font-medium text-blue-800">Upgrade to Navigator 360 Mentorship</h3>
                  <p className="text-blue-700 mt-1">
                    Take your career guidance to the next level with personalized 1:1 counseling sessions from our expert mentors.
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Deep-dive strategy sessions to clarify your career path</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Customized growth roadmap based on your assessment results</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Expert advice on education and career opportunities</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push('/upgrade')}
                    className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                  >
                    Upgrade to Mentorship
                  </button>
                </div>
                )
              )}
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Your Progress</h3>
            <span className="text-sm font-medium text-blue-600">{completedQuizzes}/{totalQuizzes} Completed</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${(completedQuizzes / totalQuizzes) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Quiz Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const isDone = userData.cardsStatus?.[card.key];
            return (
              <div
                key={index}
                onClick={() => handleCardClick(card.route)}
                className={`p-6 border rounded-lg shadow-sm cursor-pointer flex items-center justify-between hover:shadow transition-all ${
                  isDone
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${isDone ? 'bg-green-100' : 'bg-blue-50'}`}>
                  {card.icon}
                  </div>
                  <h3 className={`text-lg font-semibold ${isDone ? 'text-green-800' : 'text-gray-800'}`}>{card.title}</h3>
                </div>
                {isDone && <CheckCircleIcon className="h-6 w-6 text-green-600" />}
              </div>
            );
          })}
        </div>
      </main>

      {/* Completion Modal */}
      {showCompletionModal && (
        <CompletionModal 
          title={completedQuizName}
          nextPath="/dashboard" 
          onClose={() => setShowCompletionModal(false)}
          userName={userName}
          allCompleted={completedQuizzes === totalQuizzes}
        />
      )}
    </div>
  );
};

export default Dashboard;


