'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Input from './Input';
import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, CreditCardIcon, TagIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import { DEFAULT_PRICING, DEFAULT_PLANS } from '../utils/defaults';

// Update country codes format to show just code and abbreviation
const countryCodes = [
  { code: '+93', abbr: 'AF', name: 'Afghanistan' },
  { code: '+355', abbr: 'AL', name: 'Albania' },
  { code: '+213', abbr: 'DZ', name: 'Algeria' },
  { code: '+376', abbr: 'AD', name: 'Andorra' },
  { code: '+244', abbr: 'AO', name: 'Angola' },
  { code: '+54', abbr: 'AR', name: 'Argentina' },
  { code: '+374', abbr: 'AM', name: 'Armenia' },
  { code: '+61', abbr: 'AU', name: 'Australia' },
  { code: '+43', abbr: 'AT', name: 'Austria' },
  { code: '+994', abbr: 'AZ', name: 'Azerbaijan' },
  { code: '+973', abbr: 'BH', name: 'Bahrain' },
  { code: '+880', abbr: 'BD', name: 'Bangladesh' },
  { code: '+375', abbr: 'BY', name: 'Belarus' },
  { code: '+32', abbr: 'BE', name: 'Belgium' },
  { code: '+975', abbr: 'BT', name: 'Bhutan' },
  { code: '+591', abbr: 'BO', name: 'Bolivia' },
  { code: '+55', abbr: 'BR', name: 'Brazil' },
  { code: '+359', abbr: 'BG', name: 'Bulgaria' },
  { code: '+855', abbr: 'KH', name: 'Cambodia' },
  { code: '+237', abbr: 'CM', name: 'Cameroon' },
  { code: '+1', abbr: 'CA', name: 'Canada' },
  { code: '+56', abbr: 'CL', name: 'Chile' },
  { code: '+86', abbr: 'CN', name: 'China' },
  { code: '+57', abbr: 'CO', name: 'Colombia' },
  { code: '+506', abbr: 'CR', name: 'Costa Rica' },
  { code: '+385', abbr: 'HR', name: 'Croatia' },
  { code: '+357', abbr: 'CY', name: 'Cyprus' },
  { code: '+420', abbr: 'CZ', name: 'Czech Republic' },
  { code: '+45', abbr: 'DK', name: 'Denmark' },
  { code: '+20', abbr: 'EG', name: 'Egypt' },
  { code: '+372', abbr: 'EE', name: 'Estonia' },
  { code: '+251', abbr: 'ET', name: 'Ethiopia' },
  { code: '+679', abbr: 'FJ', name: 'Fiji' },
  { code: '+358', abbr: 'FI', name: 'Finland' },
  { code: '+33', abbr: 'FR', name: 'France' },
  { code: '+995', abbr: 'GE', name: 'Georgia' },
  { code: '+49', abbr: 'DE', name: 'Germany' },
  { code: '+233', abbr: 'GH', name: 'Ghana' },
  { code: '+30', abbr: 'GR', name: 'Greece' },
  { code: '+299', abbr: 'GL', name: 'Greenland' },
  { code: '+502', abbr: 'GT', name: 'Guatemala' },
  { code: '+852', abbr: 'HK', name: 'Hong Kong' },
  { code: '+36', abbr: 'HU', name: 'Hungary' },
  { code: '+354', abbr: 'IS', name: 'Iceland' },
  { code: '+91', abbr: 'IN', name: 'India' },
  { code: '+62', abbr: 'ID', name: 'Indonesia' },
  { code: '+98', abbr: 'IR', name: 'Iran' },
  { code: '+964', abbr: 'IQ', name: 'Iraq' },
  { code: '+353', abbr: 'IE', name: 'Ireland' },
  { code: '+972', abbr: 'IL', name: 'Israel' },
  { code: '+39', abbr: 'IT', name: 'Italy' },
  { code: '+81', abbr: 'JP', name: 'Japan' },
  { code: '+962', abbr: 'JO', name: 'Jordan' },
  { code: '+7', abbr: 'KZ', name: 'Kazakhstan' },
  { code: '+254', abbr: 'KE', name: 'Kenya' },
  { code: '+82', abbr: 'KR', name: 'Korea, South' },
  { code: '+965', abbr: 'KW', name: 'Kuwait' },
  { code: '+856', abbr: 'LA', name: 'Laos' },
  { code: '+371', abbr: 'LV', name: 'Latvia' },
  { code: '+961', abbr: 'LB', name: 'Lebanon' },
  { code: '+218', abbr: 'LY', name: 'Libya' },
  { code: '+423', abbr: 'LI', name: 'Liechtenstein' },
  { code: '+370', abbr: 'LT', name: 'Lithuania' },
  { code: '+352', abbr: 'LU', name: 'Luxembourg' },
  { code: '+853', abbr: 'MO', name: 'Macau' },
  { code: '+389', abbr: 'MK', name: 'Macedonia' },
  { code: '+261', abbr: 'MG', name: 'Madagascar' },
  { code: '+60', abbr: 'MY', name: 'Malaysia' },
  { code: '+960', abbr: 'MV', name: 'Maldives' },
  { code: '+356', abbr: 'MT', name: 'Malta' },
  { code: '+52', abbr: 'MX', name: 'Mexico' },
  { code: '+377', abbr: 'MC', name: 'Monaco' },
  { code: '+976', abbr: 'MN', name: 'Mongolia' },
  { code: '+212', abbr: 'MA', name: 'Morocco' },
  { code: '+95', abbr: 'MM', name: 'Myanmar' },
  { code: '+977', abbr: 'NP', name: 'Nepal' },
  { code: '+31', abbr: 'NL', name: 'Netherlands' },
  { code: '+64', abbr: 'NZ', name: 'New Zealand' },
  { code: '+234', abbr: 'NG', name: 'Nigeria' },
  { code: '+47', abbr: 'NO', name: 'Norway' },
  { code: '+968', abbr: 'OM', name: 'Oman' },
  { code: '+92', abbr: 'PK', name: 'Pakistan' },
  { code: '+507', abbr: 'PA', name: 'Panama' },
  { code: '+595', abbr: 'PY', name: 'Paraguay' },
  { code: '+51', abbr: 'PE', name: 'Peru' },
  { code: '+63', abbr: 'PH', name: 'Philippines' },
  { code: '+48', abbr: 'PL', name: 'Poland' },
  { code: '+351', abbr: 'PT', name: 'Portugal' },
  { code: '+974', abbr: 'QA', name: 'Qatar' },
  { code: '+40', abbr: 'RO', name: 'Romania' },
  { code: '+7', abbr: 'RU', name: 'Russia' },
  { code: '+966', abbr: 'SA', name: 'Saudi Arabia' },
  { code: '+381', abbr: 'RS', name: 'Serbia' },
  { code: '+65', abbr: 'SG', name: 'Singapore' },
  { code: '+421', abbr: 'SK', name: 'Slovakia' },
  { code: '+386', abbr: 'SI', name: 'Slovenia' },
  { code: '+27', abbr: 'ZA', name: 'South Africa' },
  { code: '+34', abbr: 'ES', name: 'Spain' },
  { code: '+94', abbr: 'LK', name: 'Sri Lanka' },
  { code: '+46', abbr: 'SE', name: 'Sweden' },
  { code: '+41', abbr: 'CH', name: 'Switzerland' },
  { code: '+886', abbr: 'TW', name: 'Taiwan' },
  { code: '+992', abbr: 'TJ', name: 'Tajikistan' },
  { code: '+66', abbr: 'TH', name: 'Thailand' },
  { code: '+216', abbr: 'TN', name: 'Tunisia' },
  { code: '+90', abbr: 'TR', name: 'Turkey' },
  { code: '+993', abbr: 'TM', name: 'Turkmenistan' },
  { code: '+256', abbr: 'UG', name: 'Uganda' },
  { code: '+380', abbr: 'UA', name: 'Ukraine' },
  { code: '+971', abbr: 'AE', name: 'United Arab Emirates' },
  { code: '+44', abbr: 'GB', name: 'United Kingdom' },
  { code: '+1', abbr: 'US', name: 'United States' },
  { code: '+598', abbr: 'UY', name: 'Uruguay' },
  { code: '+998', abbr: 'UZ', name: 'Uzbekistan' },
  { code: '+58', abbr: 'VE', name: 'Venezuela' },
  { code: '+84', abbr: 'VN', name: 'Vietnam' },
  { code: '+967', abbr: 'YE', name: 'Yemen' },
  { code: '+260', abbr: 'ZM', name: 'Zambia' },
  { code: '+263', abbr: 'ZW', name: 'Zimbabwe' },
].sort((a, b) => a.name.localeCompare(b.name));

// Separate interfaces for different sections of data
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  dob: string;
  gender: string;
}

interface EducationalInfo {
  school: string;
  schoolType: string;
  studentClass: string;
  section?: string;
  fatherOccupation: string;
  motherOccupation: string;
  topHighScoringSubjects: string;
  activities: string;
  awards: string;
  hobbies: string;
}

interface PaymentInfo {
  selectedPlan: string;
  paymentStatus: string;
  couponCode?: string;
  amount: number;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface UserData {
  personal: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    dob: string;
    gender: string;
  };
  educational: {
    school: string;
    schoolType: string;
    studentClass: string;
    section?: string;
    fatherOccupation: string;
    motherOccupation: string;
    topHighScoringSubjects: string;
    activities: string;
    awards: string;
    hobbies: string;
  };
  payment?: {
    paymentStatus: string;
    selectedPlan: string;
    amount: number;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  tenant: string;
}

// Add new interfaces for pricing and plans
interface PricingData {
  assessment: number;
  counselling: number;
}

interface PlanBenefit {
  name: string;
  benefits: string[];
  price: number;
  description: string;
  features?: string[];
}

interface PlansData {
  assessment: PlanBenefit;
  counselling: PlanBenefit;
  upgrades?: {
    'assessment-to-counselling': {
      name: string;
      description: string;
      basePrice: number;
    };
    [key: string]: any;
  };
}

interface TenantConfig {
  subdomain: string;
  features: {
    enablePayments: boolean;
    enableControlNumberAuth?: boolean;
  };
}

function getSubdomain() {
  if (typeof window === 'undefined') return '';
  const host = window.location.host;
  const [hostname] = host.split(':');
  const parts = hostname.split('.');
  if (hostname === 'localhost') return 'localhost';
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
  if (parts.length === 3) return parts[0];
  if (parts.length === 2) return '';
  return '';
}

const RegisterForm = () => {
  const isKvs = getSubdomain() === 'kvs';

  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    email: '',
    controlNumber: '',
    password: '',
    phone: '',
    countryCode: '+91',
    dob: '',
    gender: '',

    // Educational Info
    school: '',
    schoolType: '',
    studentClass: '',
    section: '',
    fatherOccupation: '',
    motherOccupation: '',
    topHighScoringSubjects: '',
    activities: '',
    awards: '',
    hobbies: '',

    // Other values
    consentGiven: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Add new state for plan selection
  const [selectedPlan, setSelectedPlan] = useState<'assessment' | 'assessment+counselling'>('assessment');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [baseAmounts, setBaseAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [discountedAmounts, setDiscountedAmounts] = useState<PricingData>(DEFAULT_PRICING);
  const [planDetails, setPlanDetails] = useState<PlansData | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState(false);
  const [errorOverlay, setErrorOverlay] = useState<{
    title: string;
    message: string;
    nextSteps: string[];
    canRetry: boolean;
  } | null>(null);

  // Fetch plan details
  useEffect(() => {
    const fetchPricingAndPlans = async () => {
      try {
        setLoadingPlans(true);
        // Set default values in case fetching fails
        const defaultPricing: PricingData = DEFAULT_PRICING;
        const defaultPlans: PlansData = DEFAULT_PLANS;
        
        // Initialize with default values first
        setBaseAmounts({...defaultPricing});
        setDiscountedAmounts({...defaultPricing});
        setPlanDetails({...defaultPlans});
        
        try {
          // Get pricing - this may fail due to permission issues
          console.log('Fetching pricing data...');
          const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
          
          if (pricingDoc.exists()) {
            const data = pricingDoc.data();
            // Ensure we have the required fields
            if (data && typeof data.assessment === 'number' && typeof data.counselling === 'number') {
              const pricingData: PricingData = {
                assessment: data.assessment,
                counselling: data.counselling
              };
              setBaseAmounts(pricingData);
              setDiscountedAmounts(pricingData);
              console.log('Successfully loaded pricing data');
            }
          } else {
            console.log('No pricing document exists, using defaults');
          }
          
          // Get plan details
          console.log('Fetching plan details...');
          const plansDoc = await getDoc(doc(db, 'settings', 'plans'));
          
          if (plansDoc.exists()) {
            const data = plansDoc.data();
            // Check for assessment and counselling objects
            if (data && data.assessment && data.counselling) {
              const plansData: PlansData = {
                assessment: {
                  name: data.assessment.name || defaultPlans.assessment.name,
                  price: data.assessment.price || defaultPlans.assessment.price,
                  benefits: data.assessment.benefits || defaultPlans.assessment.benefits,
                  description: data.assessment.description || defaultPlans.assessment.description
                },
                counselling: {
                  name: data.counselling.name || defaultPlans.counselling.name,
                  price: data.counselling.price || defaultPlans.counselling.price,
                  benefits: data.counselling.benefits || defaultPlans.counselling.benefits,
                  description: data.counselling.description || defaultPlans.counselling.description
                }
              };
              setPlanDetails(plansData);
              console.log('Successfully loaded plan details');
            }
          } else {
            console.log('No plans document exists, using defaults');
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
          console.log('Using default values due to fetching error');
          // Default values already set above, so no need to set them again
        }
      } catch (error) {
        console.error('Error in fetchPricingAndPlans:', error);
        // Default values already set above
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPricingAndPlans();
  }, []);

  // Fetch tenant configuration
  useEffect(() => {
    const fetchTenantConfig = async () => {
      try {
        const host = window.location.host;
        const subdomain = host.split('.')[0];
        
        console.log('Detected subdomain:', subdomain);
        
        const response = await fetch('/api/tenant-config', {
          headers: {
            'x-tenant': subdomain
          }
        });
        
        if (response.ok) {
          const config = await response.json();
          console.log('Tenant config loaded:', config);
          setTenantConfig(config);
        } else {
          console.error('Failed to fetch tenant config:', response.status, response.statusText);
          // Don't set tenantConfig to null, let it remain undefined to prevent fallback
        }
      } catch (error) {
        console.error('Error fetching tenant config:', error);
        // Don't set tenantConfig to null, let it remain undefined to prevent fallback
      }
    };

    fetchTenantConfig();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'dob') {
      // Handle DOB input with improved auto-formatting
      const numbersOnly = value.replace(/\D/g, '');
      let formattedDate = '';
      
      if (numbersOnly.length <= 2) {
        formattedDate = numbersOnly;
        // Add slash automatically after 2 digits for day
        if (numbersOnly.length === 2) {
          formattedDate += '/';
        }
      } else if (numbersOnly.length <= 4) {
        formattedDate = `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2)}`;
        // Add slash automatically after 2 digits for month
        if (numbersOnly.length === 4) {
          formattedDate += '/';
        }
      } else {
        formattedDate = `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2, 4)}/${numbersOnly.slice(4, 8)}`;
      }

      setFormData(prev => ({
        ...prev,
        dob: formattedDate
      }));
    } else if (name === 'phone') {
      // Only allow numbers for phone
      const numbersOnly = value.replace(/\D/g, '');
      if (numbersOnly.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: numbersOnly
        }));
      }
    } else {
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    }
  };

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
    if (!couponCode) return;
    
    setCheckingCoupon(true);
    setCouponMessage('');
    setCouponApplied(false);
    
    try {
      // Check server-side for coupon
      const apiResponse = await fetch('/api/check-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          couponCode,
          email: formData.email
        }),
      });
      
      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
      }
      
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
    } catch (error) {
      console.error('Error checking coupon:', error);
      setCouponMessage('Error validating coupon. Please try again.');
      setDiscountedAmounts(baseAmounts);
    } finally {
      setCheckingCoupon(false);
    }
  };

  // Sanitize string inputs to prevent issues with special characters
  const sanitizeString = (str: string, maxLength: number = 500): string => {
    if (!str) return '';
    // Trim whitespace
    let sanitized = str.trim();
    // Remove null bytes and control characters (except newlines and tabs for textareas)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  };

  // Sanitize email - more permissive but still safe
  const sanitizeEmail = (email: string): string => {
    if (!email) return '';
    return email.trim().toLowerCase().substring(0, 254); // RFC 5321 max email length
  };

  // Sanitize name - allow unicode but remove dangerous characters
  const sanitizeName = (name: string): string => {
    if (!name) return '';
    let sanitized = name.trim();
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }
    return sanitized;
  };

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const validateForm = () => {
    if (isKvs) {
      // KVS mode: require control number instead of email
      if (!formData.controlNumber || !formData.password || !formData.name || !formData.dob || !formData.gender || !formData.schoolType || !formData.school || !formData.studentClass || !formData.phone || !formData.consentGiven) {
        setError('Please fill in all required fields.');
        return false;
      }

      if (!formData.controlNumber.trim()) {
        setError('Please enter your control number.');
        return false;
      }
    } else {
      // Standard mode: require email
      const sanitizedEmail = sanitizeEmail(formData.email);

      if (!sanitizedEmail || !formData.password || !formData.name || !formData.dob || !formData.gender || !formData.schoolType || !formData.school || !formData.studentClass || !formData.phone || !formData.consentGiven) {
        setError('Please fill in all required fields.');
        return false;
      }

      if (!validateEmail(sanitizedEmail)) {
        setError('Please enter a valid email address. Use only letters (a-z), numbers (0-9), dots (.), underscores (_), plus signs (+), hyphens (-), and @ symbol. Example: john.doe@example.com');
        return false;
      }

      // Update formData with sanitized email
      if (sanitizedEmail !== formData.email) {
        setFormData(prev => ({ ...prev, email: sanitizedEmail }));
      }
    }

    // Validate name - check for invalid characters
    const sanitizedName = sanitizeName(formData.name);
    if (sanitizedName !== formData.name.trim()) {
      setError('Name contains invalid characters. Use only letters, spaces, and common punctuation (periods, hyphens, apostrophes). Maximum 100 characters.');
      return false;
    }
    if (formData.name.trim().length > 100) {
      setError('Name is too long. Maximum 100 characters allowed.');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number. Use only digits (0-9), no spaces, dashes, or parentheses.');
      return false;
    }

    return true;
  };

  // Helper function to save user data with retry logic
  const saveUserDataWithRetry = async (user: any, userData: any, maxRetries: number = 3): Promise<void> => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to save user data for ${user.uid}`);
        
        // Sanitize all string fields before saving
        const sanitizedEducational: Record<string, any> = {
          ...userData.educational,
          school: sanitizeString(userData.educational.school, 200),
          schoolType: sanitizeString(userData.educational.schoolType, 50),
          studentClass: sanitizeString(userData.educational.studentClass, 10),
          fatherOccupation: sanitizeString(userData.educational.fatherOccupation || '', 200),
          motherOccupation: sanitizeString(userData.educational.motherOccupation || '', 200),
          topHighScoringSubjects: sanitizeString(userData.educational.topHighScoringSubjects || '', 500),
          activities: sanitizeString(userData.educational.activities || '', 1000),
          awards: sanitizeString(userData.educational.awards || '', 1000),
          hobbies: sanitizeString(userData.educational.hobbies || '', 500),
        };
        if (userData.educational.section) {
          sanitizedEducational.section = sanitizeString(userData.educational.section, 10);
        } else {
          delete sanitizedEducational.section;
        }

        const sanitizedUserData = {
          ...userData,
          personal: {
            ...userData.personal,
            name: sanitizeName(userData.personal.name),
            email: sanitizeEmail(userData.personal.email),
            phone: sanitizeString(userData.personal.phone, 20),
            dob: sanitizeString(userData.personal.dob, 20),
            gender: sanitizeString(userData.personal.gender, 20),
            countryCode: sanitizeString(userData.personal.countryCode, 10),
          },
          educational: sanitizedEducational,
        };

        await setDoc(doc(db, 'users', user.uid), sanitizedUserData);
        console.log(`Successfully saved user data to Firestore for user: ${user.uid} (attempt ${attempt})`);
        return; // Success, exit function
      } catch (error: any) {
        lastError = error;
        console.error(`Error saving user data (attempt ${attempt}/${maxRetries}):`, error);
        
        // If it's a permission error or invalid argument, don't retry
        if (error.code === 'permission-denied' || error.code === 'invalid-argument') {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed to save user data after multiple attempts');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorOverlay(null);
    setSuccessOverlay(false);
    setLoadingOverlay(true);
    console.log('Overlay: loadingOverlay set to true (start registration)');
    if (!validateForm()) {
      setLoadingOverlay(false);
      console.log('Overlay: loadingOverlay set to false (validation failed)');
      return;
    }
    try {
      // For tenants with payment disabled (e.g., Aspire), register instantly
      if (tenantConfig?.subdomain === 'aspire' || !tenantConfig?.features.enablePayments) {
        let user: any = null;
        try {
        // Create user account with Firebase
        const registrationEmail = isKvs ? `${formData.controlNumber.trim().toLowerCase()}@kvs.internal` : formData.email;
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          registrationEmail,
          formData.password
        );
        user = userCredential.user;
        await updateProfile(user, { displayName: sanitizeName(formData.name) });

        // Create user data in Firestore
        const educationalData: Record<string, any> = {
            school: formData.school,
            schoolType: formData.schoolType,
            studentClass: formData.studentClass,
            fatherOccupation: formData.fatherOccupation,
            motherOccupation: formData.motherOccupation,
            topHighScoringSubjects: formData.topHighScoringSubjects,
            activities: formData.activities,
            awards: formData.awards,
            hobbies: formData.hobbies,
        };
        if (formData.section) {
          educationalData.section = formData.section;
        }

        const userData: Record<string, any> = {
          personal: {
            name: formData.name,
            email: registrationEmail,
            phone: formData.phone,
            countryCode: formData.countryCode,
            dob: formData.dob,
            gender: formData.gender,
          },
          educational: educationalData,
          payment: {
            selectedPlan: 'assessment',
            paymentStatus: 'paid',
            amount: 0,
          },
          cardsStatus: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          tenant: tenantConfig?.subdomain || window.location.host.split('.')[0] || 'default',
        };

        // Store KVS-specific fields
        if (isKvs) {
          userData.controlNumber = formData.controlNumber;
          userData.plaintextPassword = formData.password;
        }
          console.log('Saving user data to Firestore for user:', user.uid);
          console.log('User data to save:', JSON.stringify(userData, null, 2));
        
        // Use retry logic to save user data
        await saveUserDataWithRetry(user, userData);
          console.log('Successfully saved user data to Firestore for user:', user.uid);
        
        setSuccessOverlay(true);
        setLoadingOverlay(false);
        console.log('Overlay: successOverlay set to true, loadingOverlay set to false (instant registration)');
        // Wait a bit longer to ensure Firestore consistency before redirecting
        setTimeout(() => {
          setSuccessOverlay(false);
          console.log('Overlay: successOverlay set to false (redirect to dashboard)');
          router.push('/dashboard');
        }, 2000); // Increased from 1000ms to 2000ms for Firestore consistency
        return;
        } catch (error: any) {
          console.error('Error during instant registration:', error);
          
          let authCleanupSuccess = false;
          // If Firestore write failed but auth was created, try to delete the auth user
          if (user) {
            try {
              console.warn('Firestore write failed, attempting to delete auth user to prevent orphaned account');
              await user.delete();
              console.log('Successfully deleted orphaned auth user');
              authCleanupSuccess = true;
            } catch (deleteError) {
              console.error('Failed to delete orphaned auth user:', deleteError);
              // If we can't delete, at least log it for manual cleanup
              console.error(`MANUAL CLEANUP NEEDED: Auth user ${user.uid} exists but Firestore document was not created`);
            }
          }
          
          setLoadingOverlay(false);
          
          // Determine error type and provide appropriate messaging
          let errorDetails: { title: string; message: string; nextSteps: string[]; canRetry: boolean };
          
          if (error.code === 'permission-denied') {
            errorDetails = {
              title: 'Permission Denied',
              message: 'We encountered a permission error while creating your account. This is usually a temporary issue.',
              nextSteps: [
                'Please try registering again in a few moments',
                'If the problem persists, contact support at support@career-9.com',
                'Make sure you have a stable internet connection'
              ],
              canRetry: true
            };
          } else if (error.code === 'invalid-argument') {
            errorDetails = {
              title: 'Invalid Data Format',
              message: 'Some of the information you provided contains characters that cannot be processed. Please review the guidelines below and correct your inputs.',
              nextSteps: [
                'Name: Use only letters, spaces, and common punctuation (periods, hyphens, apostrophes). Maximum 100 characters. Avoid control characters or special symbols.',
                'Email: Use only letters (a-z), numbers (0-9), dots (.), underscores (_), plus signs (+), hyphens (-), and @ symbol. Example: john.doe@example.com',
                'Phone: Use exactly 10 digits (0-9 only). No spaces, dashes, or parentheses.',
                'Other fields: Avoid invisible control characters. Text fields support letters, numbers, spaces, and common punctuation.',
                'Remove any copied/pasted text that might contain hidden characters',
                'Try registering again with corrected information'
              ],
              canRetry: true
            };
          } else if (error.code === 'auth/email-already-in-use') {
            // Check if this might be an orphaned account (auth exists but no Firestore doc)
            let isOrphanedAccount = false;
            const checkEmail = isKvs ? `${formData.controlNumber.trim().toLowerCase()}@kvs.internal` : formData.email;
            try {
              // Try to sign in to check if account exists
              // If sign-in succeeds but no document, it's orphaned
              const testSignIn = await signInWithEmailAndPassword(auth, checkEmail, formData.password);
              const userDoc = await getDoc(doc(db, 'users', testSignIn.user.uid));
              if (!userDoc.exists()) {
                // Orphaned account detected - sign out and allow retry
                await signOut(auth);
                isOrphanedAccount = true;
              } else {
                // Normal account exists - sign out and show normal error
                await signOut(auth);
              }
            } catch (checkError: any) {
              // If sign-in fails, it's a normal "email already in use" (wrong password or real account)
              // Don't treat as orphaned
              console.log('Could not verify if account is orphaned:', checkError);
            }

            if (isOrphanedAccount) {
              errorDetails = {
                title: 'Incomplete Account Detected',
                message: isKvs
                  ? 'We found an incomplete account with this control number. This usually happens when a previous registration didn\'t complete successfully. We\'ve cleaned it up for you.'
                  : 'We found an incomplete account with this email. This usually happens when a previous registration didn\'t complete successfully. We\'ve cleaned it up for you.',
                nextSteps: [
                  'The incomplete account has been removed',
                  'You can now register again with this email',
                  'Click "Try Again" to complete your registration',
                  'If the problem persists, contact support@career-9.com'
                ],
                canRetry: true
              };
            } else {
              errorDetails = {
                title: 'Email Already Registered',
                message: 'An account with this email already exists.',
                nextSteps: [
                  'Try logging in instead of registering',
                  'If you forgot your password, use the "Forgot Password" link',
                  'If you believe this is an error, contact support at support@career-9.com'
                ],
                canRetry: false
              };
            }
          } else if (error.code === 'unavailable' || error.message?.includes('network') || error.message?.includes('timeout')) {
            errorDetails = {
              title: 'Network Error',
              message: 'We couldn\'t connect to our servers. This might be a temporary network issue.',
              nextSteps: [
                'Check your internet connection',
                'Wait a few moments and try again',
                'If you\'re on a restricted network, try using mobile data',
                'Contact support at support@career-9.com if the problem continues'
              ],
              canRetry: true
            };
          } else {
            errorDetails = {
              title: 'Registration Failed',
              message: authCleanupSuccess 
                ? 'We encountered an error while saving your account information. Your account was not created, so you can safely try again.'
                : 'We encountered an error during registration. Your account may have been partially created. If you get stuck in a loop, you\'ll be automatically signed out.',
              nextSteps: authCleanupSuccess ? [
                'Wait a few moments and try registering again',
                'Make sure all required fields are filled correctly',
                'Check your internet connection',
                'If the problem persists, contact support at support@career-9.com'
              ] : [
                'Try logging in to see if your account was created',
                'If login fails or you get stuck, try registering again with the same email',
                'If you see an "email already in use" error, the system will detect this and help you',
                'If you get stuck in a refresh loop, wait 15 seconds - you\'ll be automatically signed out',
                'Contact support at support@career-9.com for assistance'
              ],
              canRetry: true
            };
          }
          
          setErrorOverlay(errorDetails);
          console.log('Overlay: loadingOverlay set to false, errorOverlay set (instant registration error)');
          return;
        }
      }

      // For master (payment enabled):
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setLoadingOverlay(false);
        setErrorOverlay({
          title: 'Payment System Error',
          message: 'We couldn\'t load the payment system. This might be due to network restrictions or browser settings.',
          nextSteps: [
            'Check if your browser is blocking scripts',
            'Try disabling browser extensions temporarily',
            'Use a different browser or device',
            'Contact support at support@career-9.com for assistance'
          ],
          canRetry: true
        });
        console.log('Overlay: loadingOverlay set to false, errorOverlay set (Razorpay SDK failed)');
        return;
      }

      // Calculate the final amount
      const amount = selectedPlan === 'assessment' ? 
        discountedAmounts.assessment : discountedAmounts.counselling;
      // Create the order
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: formData.email,
          phone: formData.phone,
          couponCode: couponApplied ? couponCode : undefined,
          plan: selectedPlan,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.id) {
        setLoadingOverlay(false);
        setErrorOverlay({
          title: 'Payment Setup Failed',
          message: 'We couldn\'t set up your payment. This might be a temporary issue with our payment processor.',
          nextSteps: [
            'Wait a few moments and try again',
            'Check your internet connection',
            'Make sure you have sufficient funds in your account',
            'Contact support at support@career-9.com if the problem continues'
          ],
          canRetry: true
        });
        console.log('Overlay: loadingOverlay set to false, errorOverlay set (order creation failed)');
        return;
      }

      // Show Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Career-9',
        description: selectedPlan === 'assessment+counselling' ? 'Assessment + Counselling' : 'Assessment Only',
        order_id: orderData.id,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        handler: async (response: any) => {
          let user: any = null;
          try {
            // Create user account with Firebase
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            );
            user = userCredential.user;
            await updateProfile(user, { displayName: sanitizeName(formData.name) });
            
            // Create user data in Firestore
            const educationalData: Record<string, any> = {
                school: formData.school,
                schoolType: formData.schoolType,
                studentClass: formData.studentClass,
                fatherOccupation: formData.fatherOccupation,
                motherOccupation: formData.motherOccupation,
                topHighScoringSubjects: formData.topHighScoringSubjects,
                activities: formData.activities,
                awards: formData.awards,
                hobbies: formData.hobbies,
            };
            if (formData.section) {
              educationalData.section = formData.section;
            }

            const userData = {
              personal: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                countryCode: formData.countryCode,
                dob: formData.dob,
                gender: formData.gender,
              },
              educational: educationalData,
              payment: {
                selectedPlan: selectedPlan,
                paymentStatus: 'paid',
                couponCode: couponApplied ? couponCode : undefined,
                amount: orderData.amount,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              cardsStatus: {},
              createdAt: new Date(),
              updatedAt: new Date(),
              tenant: tenantConfig?.subdomain || window.location.host.split('.')[0] || 'default',
            };
            console.log('Saving user data to Firestore for user:', user.uid);
            console.log('User data to save:', JSON.stringify(userData, null, 2));
            
            // Use retry logic to save user data
            await saveUserDataWithRetry(user, userData);
            console.log('Successfully saved user data to Firestore for user:', user.uid);
            
            setSuccessOverlay(true);
            setLoadingOverlay(false);
            console.log('Overlay: successOverlay set to true, loadingOverlay set to false (payment registration)');
            // Wait a bit longer to ensure Firestore consistency before redirecting
            setTimeout(() => {
              setSuccessOverlay(false);
              console.log('Overlay: successOverlay set to false (redirect to dashboard)');
              router.push('/dashboard');
            }, 2000); // Increased from 1000ms to 2000ms for Firestore consistency
          } catch (error: any) {
            console.error('Error during payment registration:', error);
            
            let authCleanupSuccess = false;
            // If Firestore write failed but auth was created, try to delete the auth user
            if (user) {
              try {
                console.warn('Firestore write failed, attempting to delete auth user to prevent orphaned account');
                await user.delete();
                console.log('Successfully deleted orphaned auth user');
                authCleanupSuccess = true;
              } catch (deleteError) {
                console.error('Failed to delete orphaned auth user:', deleteError);
                // If we can't delete, at least log it for manual cleanup
                console.error(`MANUAL CLEANUP NEEDED: Auth user ${user.uid} exists but Firestore document was not created`);
              }
            }
            
            setLoadingOverlay(false);
            
            // Determine error type and provide appropriate messaging
            let errorDetails: { title: string; message: string; nextSteps: string[]; canRetry: boolean };
            
            if (error.code === 'permission-denied') {
              errorDetails = {
                title: 'Permission Denied',
                message: 'We encountered a permission error while creating your account. Your payment was successful, but we couldn\'t save your account information.',
                nextSteps: [
                  'Your payment has been processed successfully',
                  'Please contact support at support@career-9.com immediately with your payment ID',
                  'We will manually create your account and ensure you get access',
                  'Include your email address and payment reference number'
                ],
                canRetry: false
              };
            } else if (error.code === 'invalid-argument') {
              errorDetails = {
                title: 'Invalid Data Format',
                message: 'Your payment was successful, but some of your information contains characters that cannot be processed. Please review the guidelines below.',
                nextSteps: [
                  'Your payment has been processed successfully',
                  'Name: Use only letters, spaces, and common punctuation. Maximum 100 characters.',
                  'Email: Use only letters, numbers, dots, underscores, plus signs, hyphens, and @ symbol.',
                  'Phone: Use exactly 10 digits (0-9 only). No spaces or special characters.',
                  'Remove any copied/pasted text that might contain hidden characters',
                  'Please contact support at support@career-9.com with your payment ID if you need help',
                  'Include your email address and payment reference number'
                ],
                canRetry: false
              };
            } else if (error.code === 'auth/email-already-in-use') {
              // Check if this might be an orphaned account (auth exists but no Firestore doc)
              let isOrphanedAccount = false;
              try {
                // Try to sign in to check if account exists
                const testSignIn = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const userDoc = await getDoc(doc(db, 'users', testSignIn.user.uid));
                if (!userDoc.exists()) {
                  // Orphaned account detected - sign out and allow retry
                  await signOut(auth);
                  isOrphanedAccount = true;
                } else {
                  // Normal account exists - sign out and show normal error
                  await signOut(auth);
                }
              } catch (checkError: any) {
                // If sign-in fails, it's a normal "email already in use" (wrong password or real account)
                console.log('Could not verify if account is orphaned:', checkError);
              }

              if (isOrphanedAccount) {
                errorDetails = {
                  title: 'Incomplete Account Detected',
                  message: 'We found an incomplete account with this email. Your payment was successful, but we need to complete your registration.',
                  nextSteps: [
                    'The incomplete account has been removed',
                    'Your payment has been processed successfully',
                    'Click "Try Again" to complete your registration with the same payment',
                    'If the problem persists, contact support@career-9.com with your payment reference number'
                  ],
                  canRetry: true
                };
              } else {
                errorDetails = {
                  title: 'Email Already Registered',
                  message: 'An account with this email already exists. Your payment was successful.',
                  nextSteps: [
                    'Try logging in with this email address',
                    'If you forgot your password, use the "Forgot Password" link',
                    'If you can\'t log in, contact support at support@career-9.com',
                    'Include your payment reference number'
                  ],
                  canRetry: false
                };
              }
            } else {
              errorDetails = {
                title: 'Registration Error',
                message: authCleanupSuccess
                  ? 'Your payment was successful, but we encountered an error while creating your account. Your payment has been processed, but your account was not created.'
                  : 'Your payment was successful, but we encountered an error while creating your account. Your account may have been partially created.',
                nextSteps: authCleanupSuccess ? [
                  'Your payment has been processed successfully',
                  'Please contact support at support@career-9.com immediately',
                  'We will create your account manually and ensure you get access',
                  'Include your email address and payment reference number'
                ] : [
                  'Try logging in to see if your account was created',
                  'If login fails, contact support at support@career-9.com',
                  'Include your email address and payment reference number',
                  'We will help you complete your registration'
                ],
                canRetry: false
              };
            }
            
            setErrorOverlay(errorDetails);
            console.log('Overlay: loadingOverlay set to false, errorOverlay set (payment registration error)');
          }
        },
        theme: { color: '#0045FF' },
      };

      const razor = new (window as any).Razorpay(options);
      razor.open();
    } catch (error: any) {
      setLoadingOverlay(false);
      setErrorOverlay({
        title: 'Unexpected Error',
        message: 'An unexpected error occurred during registration. Please try again.',
        nextSteps: [
          'Check your internet connection',
          'Try refreshing the page and registering again',
          'Make sure all required fields are filled correctly',
          'Contact support at support@career-9.com if the problem persists'
        ],
        canRetry: true
      });
      console.log('Overlay: loadingOverlay set to false, errorOverlay set (outer catch)');
    }
  };

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  return (
    <>
      {loadingOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-md mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Setting Up Your Account</h2>
            <p className="text-gray-600">Please wait while we complete your registration...</p>
          </div>
        </div>
      )}
      {successOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-md mx-4">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
          </div>
        </div>
      )}
      {errorOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{errorOverlay.title}</h2>
              <p className="text-gray-600 mb-4">{errorOverlay.message}</p>
            </div>
            
            {errorOverlay.nextSteps && errorOverlay.nextSteps.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
                <ul className="space-y-2">
                  {errorOverlay.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700">
                      <span className="text-blue-600 mr-2 font-bold">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setErrorOverlay(null)} 
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition"
              >
                Close
              </button>
              {errorOverlay.canRetry && (
                <button 
                  onClick={() => {
                    setErrorOverlay(null);
                    // Scroll to top of form
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleRegister} className="p-8 space-y-8">
        {/* Personal Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Full Name*"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-gray-50"
            />
            {isKvs ? (
              <Input
                type="text"
                placeholder="Control Number*"
                name="controlNumber"
                value={formData.controlNumber}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
            ) : (
              <Input
                type="email"
                placeholder="Email Address*"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
            )}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password*"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-gray-50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                className="bg-gray-50 border rounded px-2 py-2 text-gray-700 w-24"
              >
                {countryCodes.map(country => (
                  <option key={`${country.abbr}_${country.code}`} value={country.code}>
                    {country.abbr} {country.code.replace('+', '')}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                placeholder="Phone Number*"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="bg-gray-50 flex-1"
                maxLength={10}
              />
            </div>
            <Input
              type="text"
              placeholder="Date of Birth (DD/MM/YYYY)*"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              className="bg-gray-50"
            />
            <Input
              as="select"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              placeholder="Gender*"
              options={[
          { value: 'Male', label: 'Male' },
          { value: 'Female', label: 'Female' },
          { value: 'Other', label: 'Other' },
              ]}
              className="bg-gray-50"
            />
          </div>
        </div>

        {/* Educational Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Educational Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="text"
              placeholder="School Name*"
              name="school"
              value={formData.school}
              onChange={handleChange}
              required
              className="bg-gray-50"
            />
            <Input
              as="select"
              name="schoolType"
              value={formData.schoolType}
              onChange={handleChange}
              required
              placeholder="School Type*"
              options={[
          { value: 'State Board', label: 'State Board' },
          { value: 'CBSE', label: 'CBSE' },
          { value: 'ICSE', label: 'ICSE' },
          { value: 'Non-Conventional', label: 'Non-Conventional' },
          { value: 'Other', label: 'Other' },
              ]}
              className="bg-gray-50"
            />
            <Input
              as="select"
              name="studentClass"
              value={formData.studentClass}
              onChange={handleChange}
              required
              placeholder="Class*"
              options={[
          { value: '6', label: '6' },
          { value: '7', label: '7' },
          { value: '8', label: '8' },
          { value: '9', label: '9' },
          { value: '10', label: '10' },
          { value: '11', label: '11' },
          { value: '12', label: '12' },
              ]}
              className="bg-gray-50"
            />
            <Input
              as="select"
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="Section"
              options={[
          { value: '', label: 'Select Section (Optional)' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
          { value: 'E', label: 'E' },
              ]}
              className="bg-gray-50"
            />
            <Input
              type="text"
              placeholder="Father's Occupation"
              name="fatherOccupation"
              value={formData.fatherOccupation}
              onChange={handleChange}
              className="bg-gray-50"
            />
            <Input
              type="text"
              placeholder="Mother's Occupation"
              name="motherOccupation"
              value={formData.motherOccupation}
              onChange={handleChange}
              className="bg-gray-50"
            />
          </div>
          <div className="space-y-4">
            <Input
              as="textarea"
              name="topHighScoringSubjects"
              placeholder="Top 3 High Scoring Subjects"
              value={formData.topHighScoringSubjects}
              onChange={handleChange}
              className="bg-gray-50 min-h-[100px] resize-none"
            />
            <Input
              as="textarea"
              name="activities"
              placeholder="Co-Curricular Activities (if any)"
              value={formData.activities}
              onChange={handleChange}
              className="bg-gray-50 min-h-[100px] resize-none"
            />
            <Input
              as="textarea"
              name="awards"
              placeholder="Details of Prizes/Awards won (if any)"
              value={formData.awards}
              onChange={handleChange}
              className="bg-gray-50 min-h-[100px] resize-none"
            />
            <Input
              as="textarea"
              name="hobbies"
              placeholder="Hobbies"
              value={formData.hobbies}
              onChange={handleChange}
              className="bg-gray-50 min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Plan Selection Section - Updated UI */}
        {/* Only show plan selection and coupon if payments are enabled */}
        {tenantConfig?.features.enablePayments && (
          <>
        <div className="mt-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
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
            </div>
          {/* Coupon Code Section */}
          <div className="mt-6">
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
          </>
        )}

        {/* Consent Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Consent Form</h3>
          <div className="bg-gray-50 p-6 rounded-lg text-sm text-gray-600 space-y-4">
            <p><strong>Consent for Assessment:</strong> By proceeding with this assessment, you acknowledge and agree to the following terms:</p>
            <p><strong>Purpose:</strong> This assessment is designed to help identify your strengths, interests, and potential career paths. The results will be used to provide personalized guidance and recommendations.</p>
          <p><strong>Age-Specific Considerations:</strong> For children in the age group of 12-16, this assessment measures temperament rather than fully developed personality traits. As temperament may evolve during this developmental stage, the results may change over time. We recommend retaking the assessment after a year for updated insights.</p>
          <p><strong>AI-Based Reporting Clarification:</strong> While we refer to this as an AI-based report, it is not entirely generated by artificial intelligence. The assessment is grounded in proper psychometric evaluations conducted by experts, with results customized and enhanced by AI for greater precision and personalization.</p>
          <p><strong>Data Usage:</strong> The data collected from the assessment may be used for research purposes, but any identifying information will be removed to ensure anonymity. The results of the assessment will be shared with you and other relevant stakeholders as needed.</p>
        </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="consentGiven"
              checked={formData.consentGiven}
              onChange={handleChange}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <label className="ml-3 block text-sm text-gray-900">
              I agree to the terms and conditions
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loadingMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center">
            {loadingMessage}
          </div>
        )}
        {paymentError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-center">
            {paymentError}
          </div>
        )}

        <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white p-4 rounded-lg text-lg font-semibold transition-all ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
            {loading ? 'Processing...' : tenantConfig?.features.enablePayments ? 'Register & Pay' : 'Create account'}
        </button>
        </div>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
            Login here
          </Link>
        </p>
      </form>
    </>
  );
};

export default RegisterForm;
