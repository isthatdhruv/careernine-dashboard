'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { UserData } from '../types';
import {
  CheckCircleIcon,
  CreditCardIcon,
  TagIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_PRICING, DEFAULT_PLANS } from '../utils/defaults';

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

interface UpgradePlan {
  name: string;
  description: string;
  basePrice: number;
  updatedAt?: Date;
}

interface PlansData {
  assessment: PlanBenefit;
  counselling: PlanBenefit;
  upgrades?: {
    'assessment-to-counselling': UpgradePlan;
    [key: string]: UpgradePlan;
  };
}

// Add default upgrade plan
const defaultPlans = {
  assessment: {
    name: 'Navigator 360 Assessment',
    price: 99900,
    benefits: [
      'Intelligence Based Learning Styles',
      'Customised Personality Development Suggestion',
      'Career Exploration'
    ],
    description: 'Comprehensive assessment to understand your strengths and potential career paths.'
  },
  counselling: {
    name: 'Navigator 360 Mentorship',
    price: 250000,
    benefits: [
      'Navigator 360 Assessment & Personalized 1:1 Counselling Sessions',
      'Deep-Dive Strategy Sessions',
      'Custom Growth Roadmap'
    ],
    description: 'Complete assessment with personalized mentorship to guide your career journey.'
  },
  upgrades: {
    'assessment-to-counselling': {
      name: 'Upgrade to Mentorship',
      description: 'Upgrade from Assessment to full Mentorship plan',
      basePrice: 150100 // Difference between plans
    }
  }
};

// Define default upgrade plan
const defaultUpgradePlan = {
  name: 'Upgrade to Mentorship',
  description: 'Upgrade from Assessment to full Mentorship plan',
  basePrice: 150100 // Difference between plans
};

const UpgradePage = () => {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [couponCode, setCouponCode] = useState<string>('');
  const [baseAmounts, setBaseAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [discountedAmounts, setDiscountedAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [planDetails, setPlanDetails] = useState<PlansData | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<any>(null);
  const [tenantConfig, setTenantConfig] = useState<any>(null);

  // Fetch tenant config and redirect if payments are disabled
  useEffect(() => {
    const fetchTenantConfig = async () => {
      try {
        const response = await fetch('/api/tenant-config');
        const config = await response.json();
        setTenantConfig(config);
        if (!config.features.enablePayments) {
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching tenant config:', error);
      }
    };
    fetchTenantConfig();
  }, [router]);

  // Fetch pricing and plan details
  useEffect(() => {
    const fetchPricingAndPlans = async () => {
      try {
        // Set default values in case fetching fails
        const defaultPricing = DEFAULT_PRICING;
        const defaultPlans = DEFAULT_PLANS;
        
        // Try to fetch from settings collection
        try {
          // Get pricing
          const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
          
          if (pricingDoc.exists()) {
            const pricingData = pricingDoc.data() as PricingData;
            setBaseAmounts(pricingData);
            setDiscountedAmounts(pricingData);
          } else {
            // Use default values if document doesn't exist
            setBaseAmounts(defaultPricing);
            setDiscountedAmounts(defaultPricing);
          }
          
          // Get plan details
          const plansDoc = await getDoc(doc(db, 'settings', 'plans'));
          
          if (plansDoc.exists()) {
            const plansData = plansDoc.data() as PlansData;
            setPlanDetails(plansData);
            console.log('Plan details loaded from Firestore:', plansData);
            
            // Check upgrades specifically
            if (plansData.upgrades && plansData.upgrades['assessment-to-counselling']) {
              const upgradePlan = plansData.upgrades['assessment-to-counselling'];
              console.log('Upgrade plan found in Firestore:', upgradePlan);
              setUpgradePlan(upgradePlan);
            } else {
              console.warn('No upgrade plans found in Firestore, using default');
              setUpgradePlan(defaultPlans.upgrades['assessment-to-counselling']);
            }
          } else {
            console.warn('No plans document found in Firestore, using default values');
            setPlanDetails(defaultPlans);
            setUpgradePlan(defaultPlans.upgrades['assessment-to-counselling']);
          }
        } catch (error) {
          console.error('Error fetching from settings:', error);
          setBaseAmounts(defaultPricing);
          setDiscountedAmounts(defaultPricing);
          setPlanDetails(defaultPlans);
          setUpgradePlan(defaultPlans.upgrades['assessment-to-counselling']);
        }
      } catch (error) {
        console.error('Error in fetchPricingAndPlans:', error);
      }
    };

    fetchPricingAndPlans();
  }, []);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
          router.replace('/login');
          return;
        }

        const data = userDoc.data() as UserData;
        
        // Only allow assessment plan users to access this page
        if (!data.payment || 
            data.payment.selectedPlan !== 'assessment' || 
            data.payment.paymentStatus !== 'paid') {
          router.replace('/dashboard');
          return;
        }
        
        setUserData(data);
      } catch (err) {
        console.error('Error checking user access:', err);
        router.replace('/login');
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [router]);

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
        setCouponMessage('Invalid coupon code. Please check and try again.');
        setDiscountedAmounts(baseAmounts);
        setCheckingCoupon(false);
        return;
      }
      
      const couponData = querySnapshot.docs[0].data();
      
      // Check if coupon is expired
      if (couponData.expiryDate && new Date(couponData.expiryDate.toDate()) < new Date()) {
        setCouponMessage('This coupon has expired. Please try another code.');
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
      
    } catch (error) {
      console.error('Error checking coupon:', error);
      setCouponMessage('There was an error validating your coupon. Please try again or contact support.');
      setDiscountedAmounts(baseAmounts);
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleUpgradePayment = async () => {
    if (!userData) return;
    
    setLoading(true);
    
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: difference,
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
          setLoading(true);
          try {
            // Update the user record with new plan info
            const user = auth.currentUser;
            if (!user) {
              throw new Error('No authenticated user found');
            }

            console.log('Starting plan upgrade process for user:', user.uid);
            
            // Keep track of the previous payment details for reference
            const previousPayment = { ...userData.payment };
            console.log('Previous payment details:', previousPayment);
            
            // Prepare new payment data
            const newPaymentData = {
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
            };
            console.log('New payment data:', newPaymentData);
            
            try {
              // Update user document
              await updateDoc(doc(db, 'users', user.uid), {
                'payment': newPaymentData,
                updatedAt: new Date()
              });
              console.log('User document updated with new plan');
            } catch (error) {
              console.error('Failed to update user document:', error);
              throw new Error('Failed to update user plan. Please contact support.');
            }
            
            // Record the upgrade payment
            const paymentData = {
              userId: user.uid,
              userName: userData.personal?.name,
              userEmail: userData.personal?.email,
              plan: 'assessment+counselling',
              originalAmount: discountedAmounts.counselling - discountedAmounts.assessment,
              discountedAmount: difference,
              couponCode: couponApplied ? couponCode : (userData.payment?.couponCode || null),
              previousPlan: 'assessment',
              previousPaymentId: userData.payment?.razorpay_payment_id,
              isUpgrade: true,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              createdAt: new Date()
            };
            console.log('Recording payment data:', paymentData);
            
            try {
              const paymentRef = collection(db, 'payments');
              await addDoc(paymentRef, paymentData);
              console.log('Payment record created successfully');
            } catch (error) {
              console.error('Failed to create payment record:', error);
              // Don't throw here as the user's plan is already updated
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
              // Redirect to dashboard
              router.push('/dashboard');
            }, 3000);
          } catch (error) {
            console.error('Error during upgrade process:', error);
            alert(error.message || 'An error occurred during the upgrade process. Please contact support.');
          } finally {
            setLoading(false);
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
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return <LoadingSpinner />;
  }

  if (!userData) {
    return (
      <p className="text-center mt-10 text-lg text-red-500">
        Unable to load user data. Please try logging in again.
      </p>
    );
  }

  // Hide all upgrade UI for tenants with payment disabled
  if (!tenantConfig?.features.enablePayments) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upgrades Unavailable</h2>
          <p className="text-gray-600">Upgrades are not available for your account.</p>
        </div>
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  // Calculations for price display
  const difference = discountedAmounts.counselling - discountedAmounts.assessment;
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Upgrade Your Plan</h1>
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-sm bg-blue-500 hover:bg-blue-700 py-2 px-3 rounded transition"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
            </div>
            <p className="mt-2 opacity-90">
              Unlock personalized counseling sessions with our expert mentors
            </p>
          </div>
          
          {/* Main Content */}
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left side - Current plan */}
              <div className="flex-1 border rounded-lg p-6 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Plan</h2>
                <div className="mb-4 pb-4 border-b">
                  <div className="text-gray-700 font-medium">Navigator 360 Assessment</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(baseAmounts.assessment)}</div>
                </div>
                
                <h3 className="font-medium text-gray-700 mb-3">Features</h3>
                <ul className="space-y-2">
                  {planDetails?.assessment.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Right side - Upgrade plan */}
              <div className="flex-1 border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 text-sm font-medium rounded-full w-fit mb-2">Recommended</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {upgradePlan?.name || 'Upgrade to Navigator 360 Mentorship'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {upgradePlan?.description || 'Enhance your career guidance experience with personalized 1:1 counseling sessions.'}
                </p>
                <div className="mb-4 pb-4 border-b border-blue-100">
                  <div className="text-gray-700 font-medium">Navigator 360 Mentorship</div>
                  <div className="text-3xl font-bold text-blue-700">
                    {formatPrice(discountedAmounts.counselling - discountedAmounts.assessment)}
                    {(discountedAmounts.counselling - discountedAmounts.assessment) !== 
                     (upgradePlan?.basePrice || 150100) && (
                      <span className="text-lg ml-2 text-gray-500 line-through">
                        {formatPrice(upgradePlan?.basePrice || 150100)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Additional cost for the upgrade</div>
                </div>
                
                <h3 className="font-medium text-gray-700 mb-3">Additional Features</h3>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Personalized 1:1 Counselling Sessions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Deep-Dive Strategy Sessions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Custom Growth Roadmap</span>
                  </li>
                </ul>
                
                {/* Coupon Code Section */}
                <div className="mt-4 mb-6">
                  <label className="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                    <TagIcon className="h-4 w-4 mr-1" />
                    Have a coupon code?
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full p-2 pr-20 border rounded-md focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none transition-all"
                    />
                    <button
                      onClick={handleCouponCheck}
                      disabled={!couponCode || checkingCoupon}
                      className={`absolute right-1 top-1/2 transform -translate-y-1/2 px-4 py-1 rounded-md text-white text-sm font-medium transition-all ${
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
                
                {/* Upgrade Button */}
                <button
                  onClick={handleUpgradePayment}
                  disabled={loading}
                  className={`w-full py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="h-5 w-5 mr-2" />
                      Upgrade Now for {formatPrice(difference)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage; 