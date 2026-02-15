'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getTenantConfig, type TenantConfig } from '../../lib/tenant-config';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { 
  AcademicCapIcon, 
  PhoneIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ChartBarIcon,
  ChartPieIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Fallback passwords for backward compatibility (used only if password not set in Firestore)
const ADMIN_PASSWORD = "admin2024";
const ASPIRE_ADMIN_PASSWORD = "C-9-Aspire2025";
const NBIS_ADMIN_PASSWORD = "Career-9@2025";
const DALIMSS_ADMIN_PASSWORD = "Career-9@2025";
const KVS_ADMIN_PASSWORD = "Career-9@2025";
const DPS_ADMIN_PASSWORD = "Career-9@2025";
interface DashboardStats {
  totalStudents: number;
  assessmentCompletion: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  classDistribution: {
    [key: string]: number;
  };
}

interface StudentData {
  uid: string;
  personal: {
    name: string;
    email: string;
    gender: string;
    dob: string;
    phone: string;
    school?: string;
  };
  educational: {
    studentClass: string;
    school: string;
    schoolType: string;
    section?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    topHighScoringSubjects?: string;
    activities?: string;
    awards?: string;
    hobbies?: string;
  };
  cardsStatus: {
    [key: string]: boolean;
  };
  abilityScores?: {
    [key: string]: number;
  };
  personalityScores?: {
    [key: string]: number;
  };
  multipleIntelligenceScores?: {
    [key: string]: number;
  };
  subjectsOfInterest?: string[];
  values?: string[];
  careerAspirations?: string[];
  profileCompletion: string;
  createdAt: Date;
  authCreatedAt?: Date;
  assessmentScores: {
    ability: {
      [key: string]: number;
    };
    personality: {
      [key: string]: number;
    };
    multipleIntelligence: {
      [key: string]: number;
    };
  };
  tenant: string;
  controlNumber?: string;
  plaintextPassword?: string;
}

type SortField = 'name' | 'class' | 'school' | 'status' | 'joined' | 'tenant';
type SortOrder = 'asc' | 'desc';

// Improved subdomain extraction for localhost and live environments
function getSubdomain() {
  if (typeof window === 'undefined') return '';
  const host = window.location.host;
  // Remove port if present
  const [hostname] = host.split(':');
  const parts = hostname.split('.');
  // Special case: localhost and subdomains on localhost
  if (hostname === 'localhost') return 'localhost';
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0]; // e.g. aspire.localhost
  // Live: subdomain.domain.tld
  if (parts.length === 3) return parts[0];
  if (parts.length === 2) return '';
  return '';
}

const currentTenant = getSubdomain();
const MAIN_ADMIN_SUBDOMAINS = ['localhost', 'analyze', ''];
const isMainDomain = MAIN_ADMIN_SUBDOMAINS.includes(currentTenant);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false); // Start as false to show dashboard immediately
  const [refreshing, setRefreshing] = useState(false); // Separate state for refresh button
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    assessmentCompletion: {
      completed: 0,
      inProgress: 0,
      notStarted: 0
    },
    classDistribution: {}
  });
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copyStatus, setCopyStatus] = useState<string>('');
  
  // New filter states for master admin dashboard
  const [chartTenantFilter, setChartTenantFilter] = useState<string>('all');
  const [chartClassFilter, setChartClassFilter] = useState<string>('all');
  const [availableTenants, setAvailableTenants] = useState<string[]>([]);
  
  // Collapsible filter states
  const [showDataFilters, setShowDataFilters] = useState<boolean>(false);
  const [showRegistrationFilters, setShowRegistrationFilters] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);

  // Student selection states
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  
  // Export loading states
  const [exportingDetailed, setExportingDetailed] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // KVS Students tab
  const [activeTab, setActiveTab] = useState<'overview' | 'kvs-students'>('overview');
  const [kvsSearchTerm, setKvsSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [resetPasswordUid, setResetPasswordUid] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStudents();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch tenant configuration
  useEffect(() => {
    const fetchTenantConfig = async () => {
      try {
        const config = await getTenantConfig(currentTenant || 'default');
        setTenantConfig(config);
      } catch (error) {
        console.error('Error fetching tenant config:', error);
      }
    };
    fetchTenantConfig();
  }, [currentTenant]);

  useEffect(() => {
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated');
    if (isAdminAuthenticated === 'true') {
      setAuthenticated(true);
      // Fetch data in background without blocking UI
      fetchStudents().then(() => {
        setLastRefreshTime(new Date());
      });
    }
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let loginSuccess = false;
    
    // Get password from tenant config (Firestore) or fallback to hardcoded passwords
    const getPasswordForTenant = (): string | null => {
      // First, try to get password from Firestore tenant config
      if (tenantConfig?.settings?.adminPassword) {
        return tenantConfig.settings.adminPassword;
      }
      
      // Fallback to hardcoded passwords for backward compatibility
      if (isMainDomain) {
        return ADMIN_PASSWORD;
      } else if (currentTenant === 'aspire') {
        return ASPIRE_ADMIN_PASSWORD;
      } else if (currentTenant === 'nbis') {
        return NBIS_ADMIN_PASSWORD;
      } else if (currentTenant === 'dalimss') {
        return DALIMSS_ADMIN_PASSWORD;
      } else if (currentTenant === 'kvs') {
        return KVS_ADMIN_PASSWORD;
      }
      
      return null;
    };
    
    const expectedPassword = getPasswordForTenant();
    
    if (expectedPassword && password === expectedPassword) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      loginSuccess = true;
    } else if (currentTenant === 'dps' && password === DPS_ADMIN_PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      loginSuccess = true;
    } else {
      alert('Invalid password');
      return;
    }
    
    // If login successful, fetch data immediately
    if (loginSuccess) {
      setPassword('');
      await fetchStudents();
      setLastRefreshTime(new Date());
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getAssessmentStatus = (student: StudentData) => {
    const completedQuizzes = Object.values(student.cardsStatus).filter(Boolean).length;
    const requiredQuizzes = Number(student.educational.studentClass) >= 9 ? 6 : 5;
    const adjustedCompletedQuizzes = Number(student.educational.studentClass) < 9 && student.cardsStatus?.careerAspirations 
      ? completedQuizzes - 1 
      : completedQuizzes;
    
    if (adjustedCompletedQuizzes === requiredQuizzes) return 'Completed';
    if (adjustedCompletedQuizzes > 0) return 'In Progress';
    return 'Not Started';
  };

  const calculateStats = (userData: StudentData[]) => {
    const classDist: { [key: string]: number } = {};
    const assessmentStats = {
      completed: 0,
      inProgress: 0,
      notStarted: 0
    };

    userData.forEach(student => {
      const studentClass = student.educational?.studentClass || 'Unknown';
      
      // Update class distribution
      classDist[studentClass] = (classDist[studentClass] || 0) + 1;
      
      // Calculate assessment completion
      const completedQuizzes = Object.values(student.cardsStatus || {}).filter(Boolean).length;
      const requiredQuizzes = Number(studentClass) >= 9 ? 6 : 5;
      
      // For class 6-8, remove career aspirations from completed quizzes count
      const adjustedCompletedQuizzes = Number(studentClass) < 9 && student.cardsStatus?.careerAspirations 
        ? completedQuizzes - 1 
        : completedQuizzes;
      
      if (adjustedCompletedQuizzes === requiredQuizzes) {
        assessmentStats.completed++;
      } else if (adjustedCompletedQuizzes > 0) {
        assessmentStats.inProgress++;
      } else {
        assessmentStats.notStarted++;
      }
    });

    // Verify total students matches the sum of assessment statuses
    const totalFromStatuses = assessmentStats.completed + assessmentStats.inProgress + assessmentStats.notStarted;
    if (totalFromStatuses !== userData.length) {
      console.warn('Assessment status totals do not match total students:', {
        totalStudents: userData.length,
        totalFromStatuses,
        completed: assessmentStats.completed,
        inProgress: assessmentStats.inProgress,
        notStarted: assessmentStats.notStarted
      });
    }

    // Verify class distribution totals match total students
    const totalFromClasses = Object.values(classDist).reduce((sum, count) => sum + count, 0);
    if (totalFromClasses !== userData.length) {
      console.warn('Class distribution totals do not match total students:', {
        totalStudents: userData.length,
        totalFromClasses,
        classDistribution: classDist
      });
    }

    setStats({
      totalStudents: userData.length,
      assessmentCompletion: assessmentStats,
      classDistribution: classDist
    });
  };

  // New function to get filtered data for charts
  const getFilteredDataForCharts = () => {
    return students.filter(student => {
      const matchesTenant = chartTenantFilter === 'all' || student.tenant === chartTenantFilter;
      const matchesClass = chartClassFilter === 'all' || student.educational.studentClass === chartClassFilter;
      return matchesTenant && matchesClass;
    });
  };

  // Function to calculate stats for filtered data
  const calculateFilteredStats = () => {
    const filteredData = getFilteredDataForCharts();
    calculateStats(filteredData);
  };

  const fetchStudents = async () => {
    try {
      // Don't set loading state - fetch in background
      const usersRef = collection(db, 'users');
      let q;
      if (isMainDomain) {
        q = query(usersRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(usersRef, where('tenant', '==', currentTenant), orderBy('createdAt', 'desc'));
      }
      const querySnapshot = await getDocs(q);
      
      const userData: StudentData[] = [];
      
      // Get all user records from Auth via API
      try {
        const response = await fetch('/api/users/creation-times');
        const authUserMap = new Map(Object.entries(await response.json()));
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data() as any;
          const authCreatedAt = authUserMap.get(doc.id);
          
          // Only include students with valid data
          if (data.personal?.name && data.educational?.studentClass) {
            userData.push({
              uid: doc.id,
              personal: data.personal || {},
              educational: data.educational || {},
              cardsStatus: data.cardsStatus || {},
              abilityScores: data.abilityScores,
              personalityScores: data.personalityScores,
              multipleIntelligenceScores: data.multipleIntelligenceScores,
              subjectsOfInterest: data.subjectsOfInterest,
              values: data.values,
              careerAspirations: data.careerAspirations || [],
              profileCompletion: data.profileCompletion || '0%',
              createdAt: data.createdAt?.toDate() || new Date(),
              authCreatedAt: authCreatedAt ? new Date(authCreatedAt as string) : undefined,
              assessmentScores: {
                ability: data.abilityScores || {},
                personality: data.personalityScores || {},
                multipleIntelligence: data.multipleIntelligenceScores || {}
              },
              tenant: data.tenant || '',
              controlNumber: data.controlNumber,
              plaintextPassword: data.plaintextPassword,
            });
          }
        }
      } catch (apiError) {
        console.error('Error fetching auth data, proceeding without it:', apiError);
        // Fallback: process data without auth creation times
        for (const doc of querySnapshot.docs) {
          const data = doc.data() as any;
          
          // Only include students with valid data
          if (data.personal?.name && data.educational?.studentClass) {
            userData.push({
              uid: doc.id,
              personal: data.personal || {},
              educational: data.educational || {},
              cardsStatus: data.cardsStatus || {},
              abilityScores: data.abilityScores,
              personalityScores: data.personalityScores,
              multipleIntelligenceScores: data.multipleIntelligenceScores,
              subjectsOfInterest: data.subjectsOfInterest,
              values: data.values,
              careerAspirations: data.careerAspirations || [],
              profileCompletion: data.profileCompletion || '0%',
              createdAt: data.createdAt?.toDate() || new Date(),
              authCreatedAt: undefined,
              assessmentScores: {
                ability: data.abilityScores || {},
                personality: data.personalityScores || {},
                multipleIntelligence: data.multipleIntelligenceScores || {}
              },
              tenant: data.tenant || '',
              controlNumber: data.controlNumber,
              plaintextPassword: data.plaintextPassword,
            });
          }
        }
      }
      
      // Only update students if we successfully got data
      if (userData.length > 0) {
        setStudents(userData);
        console.log('Successfully fetched students:', userData.length);
        
        // Extract available tenants for master admin
        if (isMainDomain) {
          const tenants = [...new Set(userData.map(student => student.tenant).filter(Boolean))];
          setAvailableTenants(tenants);
        }
        
        calculateStats(userData);
      } else {
        console.warn('No students data fetched, keeping existing data');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      // Don't clear students array on error, keep existing data
      console.warn('Keeping existing students data due to fetch error');
    }
    // No finally block - don't block UI with loading state
  };

  // Debounce search term for performance
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Effect to recalculate stats when chart filters change (only for master admin)
  useEffect(() => {
    if (isMainDomain && students.length > 0) {
      calculateFilteredStats();
    }
  }, [chartTenantFilter, chartClassFilter, students]);

  // Memoize filtered students for performance
  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const matchesClass = selectedClass === 'all' || student.educational.studentClass === selectedClass;
        const matchesSearch = debouncedSearchTerm === '' || 
          student.personal.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          student.personal.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          student.personal.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          student.educational.school?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || getAssessmentStatus(student) === statusFilter;
        const matchesTenant = tenantFilter === 'all' || student.tenant === tenantFilter;
        return matchesClass && matchesSearch && matchesStatus && matchesTenant;
      })
      .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return order * a.personal.name.localeCompare(b.personal.name);
        case 'class':
          return order * (Number(a.educational.studentClass) - Number(b.educational.studentClass));
        case 'school':
          return order * (a.personal?.school || '').localeCompare(b.personal?.school || '');
        case 'joined':
          const dateA = a.authCreatedAt || a.createdAt;
          const dateB = b.authCreatedAt || b.createdAt;
          return order * (dateA.getTime() - dateB.getTime());
        case 'status': {
          const aStatus = getAssessmentStatus(a);
          const bStatus = getAssessmentStatus(b);
          return order * aStatus.localeCompare(bStatus);
        }
        case 'tenant':
          return order * (a.tenant || '').localeCompare(b.tenant || '');
        default:
          return 0;
      }
    });
  }, [students, selectedClass, debouncedSearchTerm, statusFilter, tenantFilter, sortField, sortOrder]);

  // KVS students filtered list
  const kvsStudents = useMemo(() => {
    return students
      .filter(student => {
        if (student.tenant !== 'kvs') return false;
        if (!kvsSearchTerm) return true;
        const term = kvsSearchTerm.toLowerCase();
        return (
          (student.controlNumber || '').toLowerCase().includes(term) ||
          student.personal.name.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.personal.name.localeCompare(b.personal.name));
  }, [students, kvsSearchTerm]);

  const togglePasswordVisibility = useCallback((uid: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }, []);

  const handleResetPassword = useCallback(async (uid: string, password: string) => {
    setResettingPassword(uid);
    try {
      const response = await fetch('/api/kvs-auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, newPassword: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      // Update local state
      setStudents(prev =>
        prev.map(s => (s.uid === uid ? { ...s, plaintextPassword: password } : s))
      );
      setResetPasswordUid(null);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (err: any) {
      alert(`Error resetting password: ${err.message}`);
    } finally {
      setResettingPassword(null);
    }
  }, []);

  // Handle student selection - memoized for performance
  const handleStudentSelect = useCallback((studentId: string) => {
    setSelectedStudents(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(studentId)) {
        newSelected.delete(studentId);
      } else {
        newSelected.add(studentId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedStudents(prev => {
      if (prev.size === filteredStudents.length) {
        return new Set();
      } else {
        return new Set(filteredStudents.map(student => student.uid));
      }
    });
  }, [filteredStudents]);

  const exportToExcel = () => {
    // Define the headers for the Excel file in the correct order
    const headers = [
      'UID',
      'Name',
      'Class',
      'Section',
      'School',
      'DOB',
      'Email',
      'Joined Date',
      'Tenant',
      'Status',
      'Realistic',
      'Investigative', 
      'Artistic',
      'Social',
      'Enterprising',
      'Conventional',
      'Bodily-Kinesthetic',
      'Linguistic',
      'Intrapersonal',
      'Interpersonal',
      'Logical',
      'Musical',
      'Visual-Spatial',
      'Naturalistic',
      'Creativity',
      'Logical reasoning',
      'Communication',
      'Form perception',
      'Computational',
      'Finger dexterity',
      'Technical',
      'Motor movement',
      'Decision making & problem solving',
      'Speed and accuracy',
      'Subject Of Interest 1',
      'Subject Of Interest 2',
      'Subject Of Interest 3',
      'Subject Of Interest 4',
      'Subject Of Interest 5',
      'Value 1',
      'Value 2',
      'Value 3',
      'Value 4',
      'Value 5',
      'Career Aspiration 1',
      'Career Aspiration 2',
      'Career Aspiration 3',
      'Career Aspiration 4'
    ];

    // Prepare the data for export in the same order as headers
    const exportData = filteredStudents.map(student => {
      // Create array of values in the same order as headers
      const rowData = [
        student.uid || '',
        student.personal.name || '',
        student.educational.studentClass || '',
        student.educational.section || '',
        student.educational.school || '',
        student.personal.dob || '',
        student.personal.email || '',
        (student.authCreatedAt || student.createdAt).toLocaleDateString() || '',
        student.tenant || '',
        getAssessmentStatus(student),
        student.personalityScores?.R || 0,
        student.personalityScores?.I || 0,
        student.personalityScores?.A || 0,
        student.personalityScores?.S || 0,
        student.personalityScores?.E || 0,
        student.personalityScores?.C || 0,
        student.multipleIntelligenceScores?.['Bodily-Kinesthetic'] || 0,
        student.multipleIntelligenceScores?.Linguistic || 0,
        student.multipleIntelligenceScores?.Intrapersonal || 0,
        student.multipleIntelligenceScores?.Interpersonal || 0,
        student.multipleIntelligenceScores?.['Logical-Mathematical'] || 0,
        student.multipleIntelligenceScores?.Musical || 0,
        student.multipleIntelligenceScores?.['Spatial-Visual'] || 0,
        student.multipleIntelligenceScores?.Naturalistic || 0,
        student.abilityScores?.['Creativity / Artistic'] || 0,
        student.abilityScores?.['Logical reasoning'] || 0,
        student.abilityScores?.['Language/ Communication'] || 0,
        student.abilityScores?.['Form perception'] || 0,
        student.abilityScores?.Computational || 0,
        student.abilityScores?.['Finger dexterity'] || 0,
        student.abilityScores?.Technical || 0,
        student.abilityScores?.['Motor movement'] || 0,
        student.abilityScores?.['Decision making & problem solving'] || 0,
        student.abilityScores?.['Speed and accuracy'] || 0,
        (student.subjectsOfInterest || [])[0] || '',
        (student.subjectsOfInterest || [])[1] || '',
        (student.subjectsOfInterest || [])[2] || '',
        (student.subjectsOfInterest || [])[3] || '',
        (student.subjectsOfInterest || [])[4] || '',
        (student.values || [])[0] || '',
        (student.values || [])[1] || '',
        (student.values || [])[2] || '',
        (student.values || [])[3] || '',
        (student.values || [])[4] || '',
        (student.careerAspirations || [])[0] || '',
        (student.careerAspirations || [])[1] || '',
        (student.careerAspirations || [])[2] || '',
        (student.careerAspirations || [])[3] || ''
      ];
      
      return rowData;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Add headers as the first row
    const allData = [headers, ...exportData];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `student_data_${date}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const exportSelectedToExcel = () => {
    // Get selected students
    const selectedStudentData = filteredStudents.filter(student => selectedStudents.has(student.uid));
    
    if (selectedStudentData.length === 0) {
      alert('Please select at least one student to export.');
      return;
    }

    // Define the headers for the Excel file in the correct order
    const headers = [
      'UID',
      'Name',
      'Class',
      'Section',
      'School',
      'DOB',
      'Email',
      'Joined Date',
      'Tenant',
      'Status',
      'Realistic',
      'Investigative', 
      'Artistic',
      'Social',
      'Enterprising',
      'Conventional',
      'Bodily-Kinesthetic',
      'Linguistic',
      'Intrapersonal',
      'Interpersonal',
      'Logical',
      'Musical',
      'Visual-Spatial',
      'Naturalistic',
      'Creativity',
      'Logical reasoning',
      'Communication',
      'Form perception',
      'Computational',
      'Finger dexterity',
      'Technical',
      'Motor movement',
      'Decision making & problem solving',
      'Speed and accuracy',
      'Subject Of Interest 1',
      'Subject Of Interest 2',
      'Subject Of Interest 3',
      'Subject Of Interest 4',
      'Subject Of Interest 5',
      'Value 1',
      'Value 2',
      'Value 3',
      'Value 4',
      'Value 5',
      'Career Aspiration 1',
      'Career Aspiration 2',
      'Career Aspiration 3',
      'Career Aspiration 4'
    ];

    // Prepare the data for export in the same order as headers
    const exportData = selectedStudentData.map(student => {
      // Create array of values in the same order as headers
      const rowData = [
        student.uid || '',
        student.personal.name || '',
        student.educational.studentClass || '',
        student.educational.section || '',
        student.educational.school || '',
        student.personal.dob || '',
        student.personal.email || '',
        (student.authCreatedAt || student.createdAt).toLocaleDateString() || '',
        student.tenant || '',
        getAssessmentStatus(student),
        student.personalityScores?.R || 0,
        student.personalityScores?.I || 0,
        student.personalityScores?.A || 0,
        student.personalityScores?.S || 0,
        student.personalityScores?.E || 0,
        student.personalityScores?.C || 0,
        student.multipleIntelligenceScores?.['Bodily-Kinesthetic'] || 0,
        student.multipleIntelligenceScores?.Linguistic || 0,
        student.multipleIntelligenceScores?.Intrapersonal || 0,
        student.multipleIntelligenceScores?.Interpersonal || 0,
        student.multipleIntelligenceScores?.['Logical-Mathematical'] || 0,
        student.multipleIntelligenceScores?.Musical || 0,
        student.multipleIntelligenceScores?.['Spatial-Visual'] || 0,
        student.multipleIntelligenceScores?.Naturalistic || 0,
        student.abilityScores?.['Creativity / Artistic'] || 0,
        student.abilityScores?.['Logical reasoning'] || 0,
        student.abilityScores?.['Language/ Communication'] || 0,
        student.abilityScores?.['Form perception'] || 0,
        student.abilityScores?.Computational || 0,
        student.abilityScores?.['Finger dexterity'] || 0,
        student.abilityScores?.Technical || 0,
        student.abilityScores?.['Motor movement'] || 0,
        student.abilityScores?.['Decision making & problem solving'] || 0,
        student.abilityScores?.['Speed and accuracy'] || 0,
        (student.subjectsOfInterest || [])[0] || '',
        (student.subjectsOfInterest || [])[1] || '',
        (student.subjectsOfInterest || [])[2] || '',
        (student.subjectsOfInterest || [])[3] || '',
        (student.subjectsOfInterest || [])[4] || '',
        (student.values || [])[0] || '',
        (student.values || [])[1] || '',
        (student.values || [])[2] || '',
        (student.values || [])[3] || '',
        (student.values || [])[4] || '',
        (student.careerAspirations || [])[0] || '',
        (student.careerAspirations || [])[1] || '',
        (student.careerAspirations || [])[2] || '',
        (student.careerAspirations || [])[3] || ''
      ];
      
      return rowData;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Add headers as the first row
    const allData = [headers, ...exportData];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Students');
    
    // Generate filename with current date and selection info
    const date = new Date().toISOString().split('T')[0];
    const tenantInfo = tenantFilter !== 'all' ? `_${tenantFilter}` : '';
    const filename = `selected_students${tenantInfo}_${date}_${selectedStudentData.length}students.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const exportTenantToExcel = () => {
    // Define the headers for tenant admin Excel export
    const headers = [
      'Name',
      'Phone',
      'Email',
      'Class',
      'Section',
      'School',
      'Joined Date',
      'Status'
    ];

    // Prepare the data for export in the same order as headers
    const exportData = filteredStudents.map(student => {
      // Create array of values in the same order as headers
      const rowData = [
        student.personal.name || '',
        student.personal.phone || '',
        student.personal.email || '',
        student.educational.studentClass || '',
        student.educational.section || '',
        student.educational.school || '',
        (student.authCreatedAt || student.createdAt).toLocaleDateString() || '',
        getAssessmentStatus(student)
      ];
      
      return rowData;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Add headers as the first row
    const allData = [headers, ...exportData];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
    
    // Generate filename with current date and tenant
    const date = new Date().toISOString().split('T')[0];
    const filename = `${currentTenant}_student_data_${date}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const assessmentCompletionData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [{
      label: 'Assessment Status',
      data: [
        stats.assessmentCompletion.completed,
        stats.assessmentCompletion.inProgress,
        stats.assessmentCompletion.notStarted
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
    }]
  };

  const classDistributionData = {
    labels: Object.keys(stats.classDistribution).sort((a, b) => Number(a) - Number(b)),
    datasets: [{
      label: 'Students per Class',
      data: Object.keys(stats.classDistribution).sort((a, b) => Number(a) - Number(b)).map(key => stats.classDistribution[key]),
      backgroundColor: '#3B82F6'
    }]
  };

  // New chart data for tenant-wise student distribution with class breakdown
  const getTenantClassDistributionData = () => {
    const filteredData = getFilteredDataForCharts();
    
    // Group students by tenant and class
    const tenantClassData: { [tenant: string]: { [className: string]: number } } = {};
    
    filteredData.forEach(student => {
      const tenant = student.tenant || 'Unknown';
      const studentClass = student.educational?.studentClass || 'Unknown';
      
      if (!tenantClassData[tenant]) {
        tenantClassData[tenant] = {};
      }
      tenantClassData[tenant][studentClass] = (tenantClassData[tenant][studentClass] || 0) + 1;
    });
    
    // Get all unique classes for consistent colors
    const allClasses = [...new Set(filteredData.map(s => s.educational?.studentClass || 'Unknown'))].sort((a, b) => Number(a) - Number(b));
    
    // Create datasets for each class
    const datasets = allClasses.map((cls, index) => {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
      return {
        label: `Class ${cls}`,
        data: Object.keys(tenantClassData).map(tenant => tenantClassData[tenant][cls] || 0),
        backgroundColor: colors[index % colors.length],
        stack: 'Stack 0'
      };
    });
    
    // Calculate totals for each tenant
    const tenantTotals = Object.keys(tenantClassData).map(tenant => {
      return Object.values(tenantClassData[tenant]).reduce((sum, count) => sum + count, 0);
    });
    
    return {
      labels: Object.keys(tenantClassData).map((tenant, index) => `${tenant} (${tenantTotals[index]} total)`),
      datasets: datasets,
      tenantTotals: tenantTotals
    };
  };

  const tenantClassDistributionData = useMemo(
    () => getTenantClassDistributionData(),
    [students, chartTenantFilter, chartClassFilter]
  );

  // New chart data for class-wise completion percentage
  const getClassCompletionData = () => {
    const filteredData = getFilteredDataForCharts();
    
    // Group students by class and calculate completion status
    const classCompletionData: { [className: string]: { completed: number; inProgress: number; notStarted: number; total: number } } = {};
    
    filteredData.forEach(student => {
      const studentClass = student.educational?.studentClass || 'Unknown';
      const status = getAssessmentStatus(student);
      
      if (!classCompletionData[studentClass]) {
        classCompletionData[studentClass] = { completed: 0, inProgress: 0, notStarted: 0, total: 0 };
      }
      
      classCompletionData[studentClass].total++;
      
      if (status === 'Completed') {
        classCompletionData[studentClass].completed++;
      } else if (status === 'In Progress') {
        classCompletionData[studentClass].inProgress++;
      } else {
        classCompletionData[studentClass].notStarted++;
      }
    });
    
    // Sort classes and calculate percentages
    const sortedClasses = Object.keys(classCompletionData).sort((a, b) => Number(a) - Number(b));
    
    return {
      labels: sortedClasses.map(cls => `Class ${cls}`),
      datasets: [
        {
          label: 'Completed',
          data: sortedClasses.map(cls => {
            const data = classCompletionData[cls];
            return data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
          }),
          backgroundColor: '#10B981',
          stack: 'Stack 0'
        },
        {
          label: 'In Progress',
          data: sortedClasses.map(cls => {
            const data = classCompletionData[cls];
            return data.total > 0 ? Math.round((data.inProgress / data.total) * 100) : 0;
          }),
          backgroundColor: '#F59E0B',
          stack: 'Stack 0'
        },
        {
          label: 'Not Started',
          data: sortedClasses.map(cls => {
            const data = classCompletionData[cls];
            return data.total > 0 ? Math.round((data.notStarted / data.total) * 100) : 0;
          }),
          backgroundColor: '#EF4444',
          stack: 'Stack 0'
        }
      ],
      // Add absolute counts for tooltips
      absoluteData: sortedClasses.map(cls => {
        const data = classCompletionData[cls];
        return {
          completed: data.completed,
          inProgress: data.inProgress,
          notStarted: data.notStarted,
          total: data.total
        };
      })
    };
  };

  const classCompletionData = useMemo(
    () => getClassCompletionData(),
    [students, chartTenantFilter, chartClassFilter]
  );

  // New chart data for student registration trends with multiple time granularities
  const getRegistrationTrendData = (granularity: 'month' | 'week' | 'day' = 'month') => {
    const filteredData = getFilteredDataForCharts();
    
    // Filter by date range if specified
    let dateFilteredData = filteredData;
    if (dateRange.from || dateRange.to) {
      dateFilteredData = filteredData.filter(student => {
        const date = student.authCreatedAt || student.createdAt;
        const studentDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (dateRange.from && studentDate < dateRange.from) return false;
        if (dateRange.to && studentDate > dateRange.to) return false;
        return true;
      });
    }
    
    // Group students by time period
    const timeData: { [key: string]: number } = {};
    
    dateFilteredData.forEach(student => {
      const date = student.authCreatedAt || student.createdAt;
      let timeKey: string;
      
      if (granularity === 'day') {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        timeKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      } else {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      timeData[timeKey] = (timeData[timeKey] || 0) + 1;
    });
    
    // Sort time periods
    const sortedTimeKeys = Object.keys(timeData).sort();
    
    // If no data, return empty chart
    if (sortedTimeKeys.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'New Registrations',
          data: [],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }],
        dateRange: '',
        totalRegistrations: 0
      };
    }
    
    // Get the date range for the chart title
    const firstTimeKey = sortedTimeKeys[0];
    const lastTimeKey = sortedTimeKeys[sortedTimeKeys.length - 1];
    
    const formatDateRange = () => {
      if (granularity === 'day') {
        const [firstYear, firstMonth, firstDay] = firstTimeKey.split('-');
        const [lastYear, lastMonth, lastDay] = lastTimeKey.split('-');
        const startDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, parseInt(firstDay));
        const endDate = new Date(parseInt(lastYear), parseInt(lastMonth) - 1, parseInt(lastDay));
        
        if (startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      } else if (granularity === 'week') {
        const [firstYear, firstMonth, firstDay] = firstTimeKey.split('-');
        const [lastYear, lastMonth, lastDay] = lastTimeKey.split('-');
        const startDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, parseInt(firstDay));
        const endDate = new Date(parseInt(lastYear), parseInt(lastMonth) - 1, parseInt(lastDay));
        
        if (startDate.getFullYear() === endDate.getFullYear()) {
          return `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Week of ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
          return `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - Week of ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      } else {
        const [firstYear, firstMonth] = firstTimeKey.split('-');
        const [lastYear, lastMonth] = lastTimeKey.split('-');
        const startDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1);
        const endDate = new Date(parseInt(lastYear), parseInt(lastMonth) - 1);
        
        if (startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        } else {
          return `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        }
      }
    };
    
    const formatLabel = (timeKey: string) => {
      if (granularity === 'day') {
        const [year, month, day] = timeKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (granularity === 'week') {
        const [year, month, day] = timeKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        const [year, month] = timeKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };
    
    return {
      labels: sortedTimeKeys.map(formatLabel),
      datasets: [{
        label: 'New Registrations',
        data: sortedTimeKeys.map(timeKey => timeData[timeKey] || 0),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }],
      dateRange: formatDateRange(),
      totalRegistrations: dateFilteredData.length,
      granularity: granularity
    };
  };

  const [registrationGranularity, setRegistrationGranularity] = useState<'month' | 'week' | 'day'>('month');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const registrationTrendData = useMemo(
    () => getRegistrationTrendData(registrationGranularity),
    [students, registrationGranularity, dateRange, chartTenantFilter, chartClassFilter]
  );



  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Removed loading spinner - show dashboard immediately

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isMainDomain ? 'Master Admin Dashboard' : `${currentTenant.toUpperCase()} Admin Dashboard`}
            </h1>
            <p className="text-gray-600 mt-1">
              {isMainDomain ? 'Overview of all student assessments across all tenants' : 'Student assessment overview'}
            </p>
            {lastRefreshTime && (
              <p className="text-xs text-gray-500 mt-1">
                Last refreshed: {lastRefreshTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Bar - Only for KVS */}
        {currentTenant === 'kvs' && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('kvs-students')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'kvs-students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                KVS Students
              </button>
            </nav>
          </div>
        )}

        {/* KVS Students Tab Content */}
        {currentTenant === 'kvs' && activeTab === 'kvs-students' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">KVS Students</h2>
                <div className="relative w-full md:w-64">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by control number or name..."
                    value={kvsSearchTerm}
                    onChange={(e) => setKvsSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Control Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kvsStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {kvsSearchTerm ? 'No students match your search.' : 'No KVS students found.'}
                      </td>
                    </tr>
                  ) : (
                    kvsStudents.map((student) => (
                      <tr key={student.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.controlNumber || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {student.personal.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {student.educational.studentClass}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {student.plaintextPassword ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">
                                {visiblePasswords.has(student.uid)
                                  ? student.plaintextPassword
                                  : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(student.uid)}
                                className="text-gray-400 hover:text-gray-600"
                                title={visiblePasswords.has(student.uid) ? 'Hide password' : 'Show password'}
                              >
                                {visiblePasswords.has(student.uid) ? (
                                  <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not stored</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {resetPasswordUid === student.uid ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleResetPassword(student.uid, newPassword)}
                                disabled={!newPassword || newPassword.length < 8 || resettingPassword === student.uid}
                                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {resettingPassword === student.uid ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => { setResetPasswordUid(null); setNewPassword(''); }}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetPasswordUid(student.uid)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors"
                            >
                              <KeyIcon className="h-3 w-3" />
                              Reset Password
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t text-sm text-gray-500">
              {kvsStudents.length} student{kvsStudents.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Overview Tab Content (default) */}
        {(currentTenant !== 'kvs' || activeTab === 'overview') && (
        <>
        {/* Simple Data Filters - Only for Master Admin */}
        {isMainDomain && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDataFilters(!showDataFilters)}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
              >
                {showDataFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {showDataFilters && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Tenant:</label>
                    <select
                      value={chartTenantFilter}
                      onChange={(e) => setChartTenantFilter(e.target.value)}
                      className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    >
                      <option value="all">All Tenants</option>
                      {availableTenants.map(tenant => (
                        <option key={tenant} value={tenant}>{tenant}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Class:</label>
                    <select
                      value={chartClassFilter}
                      onChange={(e) => setChartClassFilter(e.target.value)}
                      className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    >
                      <option value="all">All Classes</option>
                      {Object.keys(stats.classDistribution).sort((a, b) => Number(a) - Number(b)).map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setChartTenantFilter('all');
                      setChartClassFilter('all');
                    }}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            {showDataFilters && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chartTenantFilter !== 'all' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    Tenant: {chartTenantFilter}
                  </span>
                )}
                {chartClassFilter !== 'all' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                    Class: {chartClassFilter}
                  </span>
                )}
                {chartTenantFilter === 'all' && chartClassFilter === 'all' && (
                  <span className="text-gray-500 text-xs">Showing all data</span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UsersIcon className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-700">Total Students</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-700">Completed Assessments</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.assessmentCompletion.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-700">In Progress</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.assessmentCompletion.inProgress}</p>
          </div>
        </div>

        {/* Additional Stats Cards - Only for Master Admin */}
        {isMainDomain && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-700">Completion Rate</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {stats.totalStudents > 0 ? Math.round((stats.assessmentCompletion.completed / stats.totalStudents) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-700">Active Tenants</h3>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{availableTenants.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <XCircleIcon className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-700">Not Started</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.assessmentCompletion.notStarted}</p>
            </div>
          </div>
        )}

        {/* Charts Section with Integrated Filters */}
        <div className="space-y-6 mb-8">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartPieIcon className="h-6 w-6 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-700">Assessment Completion</h3>
              </div>
              <div className="h-64">
                <Pie data={assessmentCompletionData} options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        title: function(context) {
                          return context[0].label;
                        },
                        label: function(context) {
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                          return `${context.parsed} students (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="h-6 w-6 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-700">Class Distribution</h3>
              </div>
              <div className="h-64">
                <Bar 
                  data={classDistributionData} 
                  options={{ 
                    maintainAspectRatio: false,
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                          title: function(context) {
                            return `Class ${context[0].label}`;
                          },
                          label: function(context) {
                            return `${context.parsed.y} students`;
                          }
                        }
                      }
                    },
                    interaction: {
                      mode: 'nearest',
                      axis: 'x',
                      intersect: false
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Tenant-wise Class Distribution Chart - Only for Master Admin */}
          {isMainDomain && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BuildingOfficeIcon className="h-6 w-6 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-700">Tenant-wise Student Distribution</h3>
                </div>
                <div className="h-64">
                  <Bar 
                    data={tenantClassDistributionData} 
                    options={{ 
                      maintainAspectRatio: false,
                      indexAxis: 'y' as const,
                      scales: {
                        x: {
                          stacked: true,
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        },
                        y: {
                          stacked: true
                        }
                      },
                      plugins: {
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                          callbacks: {
                            title: function(context) {
                              const tenant = context[0].label;
                              const totalStudents = context.reduce((sum, item) => sum + item.parsed.x, 0);
                              return `${tenant} - ${totalStudents} total students`;
                            },
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.x} students`;
                            }
                          }
                        },
                        legend: {
                          display: true,
                          position: 'top' as const
                        }
                      },
                      interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                      }
                    }} 
                  />
                </div>
              </div>

              {/* Class-wise Completion Percentage Chart - Only for Master Admin */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBarIcon className="h-6 w-6 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-700">Class-wise Completion %</h3>
                </div>
                <div className="h-64">
                  <Bar 
                    data={classCompletionData} 
                    options={{ 
                      maintainAspectRatio: false,
                      responsive: true,
                      scales: {
                        x: {
                          stacked: true
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            stepSize: 20,
                            callback: function(value) {
                              return value + '%';
                            }
                          }
                        }
                      },
                      plugins: {
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                          callbacks: {
                            title: function(context) {
                              return context[0].label;
                            },
                            label: function(context) {
                              try {
                                const absoluteData = classCompletionData.absoluteData[context.dataIndex];
                                const status = context.dataset.label.toLowerCase();
                                let absoluteCount = 0;
                                
                                if (status === 'completed') {
                                  absoluteCount = absoluteData.completed;
                                } else if (status === 'in progress') {
                                  absoluteCount = absoluteData.inProgress;
                                } else if (status === 'not started') {
                                  absoluteCount = absoluteData.notStarted;
                                }
                                
                                return `${absoluteCount} students (${context.parsed.y}%)`;
                              } catch (error) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                              }
                            }
                          }
                        },
                        legend: {
                          display: true,
                          position: 'top' as const
                        }
                      },
                      interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Registration Trends Chart - Only for Master Admin */}
          {isMainDomain && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-6 w-6 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-700">
                    Student Registration Trends
                    {registrationTrendData.dateRange && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({registrationTrendData.dateRange})
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRegistrationFilters(!showRegistrationFilters)}
                    className="text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                  >
                    {showRegistrationFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">View:</label>
                    <select
                      value={registrationGranularity}
                      onChange={(e) => setRegistrationGranularity(e.target.value as 'month' | 'week' | 'day')}
                      className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    >
                      <option value="month">Monthly</option>
                      <option value="week">Weekly</option>
                      <option value="day">Daily</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {showRegistrationFilters && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">From:</label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">To:</label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                  <button
                    onClick={() => setDateRange({ from: '', to: '' })}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Clear Dates
                  </button>
                </div>
              )}
              
              <div className="h-80">
                <Line 
                  data={registrationTrendData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: true
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                          title: function(context) {
                            return context[0].label;
                          },
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}`;
                          }
                        }
                      }
                    },
                    interaction: {
                      mode: 'nearest',
                      axis: 'x',
                      intersect: false
                    }
                  }} 
                />
              </div>
              {registrationTrendData.totalRegistrations !== undefined && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Total registrations in selected period: <span className="font-semibold text-gray-900">{registrationTrendData.totalRegistrations}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Student List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Student List</h2>
                <div className="flex flex-col gap-2">
                  {/* Success/Error Messages */}
                  {exportSuccess && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Export successful! File downloaded.
                    </div>
                  )}
                  {exportError && (
                    <div className="text-xs text-red-600 font-medium">
                      ✗ {exportError}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {/* Export Buttons - Only 2 buttons, dynamic text based on selection */}
                  {isMainDomain ? (
                    <>
                      <button
                        onClick={selectedStudents.size > 0 ? exportSelectedToExcel : exportToExcel}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        {selectedStudents.size > 0 
                          ? `Export Selected Scores (${selectedStudents.size})`
                          : 'Export Scores'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setExportingDetailed(true);
                            setExportError(null);
                            setExportSuccess(false);
                            
                            const selectedUids = Array.from(selectedStudents);
                            const url = selectedUids.length > 0 
                              ? `/api/admin/export-detailed?uids=${selectedUids.join(',')}`
                              : '/api/admin/export-detailed';
                            
                            const response = await fetch(url);
                            
                            if (!response.ok) {
                              throw new Error(`Export failed: ${response.statusText}`);
                            }
                            
                            const blob = await response.blob();
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            
                            // Get filename from Content-Disposition header or use default
                            const contentDisposition = response.headers.get('Content-Disposition');
                            let filename = 'detailed_assessment_responses.xlsx';
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                              if (filenameMatch) {
                                filename = filenameMatch[1];
                              }
                            }
                            
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(downloadUrl);
                            
                            setExportSuccess(true);
                            setTimeout(() => setExportSuccess(false), 3000);
                          } catch (error) {
                            console.error('Export error:', error);
                            setExportError(error instanceof Error ? error.message : 'Failed to export detailed responses');
                            setTimeout(() => setExportError(null), 5000);
                          } finally {
                            setExportingDetailed(false);
                          }
                        }}
                        disabled={exportingDetailed}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exportingDetailed ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            {selectedStudents.size > 0 
                              ? `Export Selected Detailed (${selectedStudents.size})`
                              : 'Export Detailed Responses'}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={exportTenantToExcel}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Export Scores
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setExportingDetailed(true);
                            setExportError(null);
                            setExportSuccess(false);
                            
                            const response = await fetch('/api/admin/export-detailed');
                            
                            if (!response.ok) {
                              throw new Error(`Export failed: ${response.statusText}`);
                            }
                            
                            const blob = await response.blob();
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            
                            // Get filename from Content-Disposition header or use default
                            const contentDisposition = response.headers.get('Content-Disposition');
                            let filename = 'detailed_assessment_responses.xlsx';
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                              if (filenameMatch) {
                                filename = filenameMatch[1];
                              }
                            }
                            
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(downloadUrl);
                            
                            setExportSuccess(true);
                            setTimeout(() => setExportSuccess(false), 3000);
                          } catch (error) {
                            console.error('Export error:', error);
                            setExportError(error instanceof Error ? error.message : 'Failed to export detailed responses');
                            setTimeout(() => setExportError(null), 5000);
                          } finally {
                            setExportingDetailed(false);
                          }
                        }}
                        disabled={exportingDetailed}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exportingDetailed ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Export Detailed Responses
                          </>
                        )}
                      </button>
                    </>
                  )}
                  </div>
                </div>
              </div>
              
              {/* Filters Row - Cleaner UI */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {isMainDomain && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Tenant:</label>
                    <select
                      value={tenantFilter}
                      onChange={(e) => {
                        setTenantFilter(e.target.value);
                        setSelectedStudents(new Set());
                      }}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1.5 px-2 min-w-[120px]"
                    >
                      <option value="all">All Tenants</option>
                      {availableTenants.map(tenant => (
                        <option key={tenant} value={tenant}>{tenant.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Class:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedStudents(new Set());
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1.5 px-2 min-w-[120px]"
                  >
                    <option value="all">All Classes</option>
                    {Object.keys(stats.classDistribution).sort((a, b) => Number(a) - Number(b)).map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setSelectedStudents(new Set());
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1.5 px-2 min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Search:</label>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedStudents(new Set());
                      }}
                      className="pl-8 pr-3 py-1.5 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="Name, email, phone, or school..."
                    />
                  </div>
                </div>
                {isMainDomain && filteredStudents.length > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {selectedStudents.size > 0 && (
                        <span className="font-medium text-blue-600">{selectedStudents.size}</span>
                      )}
                      {selectedStudents.size > 0 && ' / '}
                      <span className="font-medium">{filteredStudents.length}</span> students
                    </span>
                    {selectedStudents.size > 0 && (
                      <button
                        onClick={() => setSelectedStudents(new Set())}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isMainDomain && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
                        title={selectedStudents.size === filteredStudents.length ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      Student Info {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('class')}
                  >
                    <div className="flex items-center gap-1">
                      <AcademicCapIcon className="h-4 w-4" />
                      Educational Info {sortField === 'class' && (sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      Status {sortField === 'status' && (sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('joined')}
                  >
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      Joined {sortField === 'joined' && (sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />)}
                    </div>
                  </th>
                  {isMainDomain && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => handleSort('tenant')}>
                      <div className="flex items-center gap-1">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        Tenant {sortField === 'tenant' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                  )}
                  {isMainDomain && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      Actions
                    </div>
                  </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => {
                  const status = getAssessmentStatus(student);
                  
                  return (
                    <tr key={student.uid} className="hover:bg-gray-50">
                      {isMainDomain && (
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.uid)}
                            onChange={() => handleStudentSelect(student.uid)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.personal.name}</div>
                        <div className="text-sm text-gray-500">{student.personal.email}</div>
                        <div className="text-sm text-gray-400">{student.personal.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="group relative">
                          <div className="max-w-[200px] truncate font-medium">
                            {student.educational.school}
                          </div>
                          <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 z-10 whitespace-normal max-w-xs">
                            {student.educational.school}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">Class {student.educational.studentClass}</div>
                        <div className="text-xs text-gray-400">
                          {student.educational.schoolType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          status === 'Completed'
                            ? 'bg-green-100 text-green-800' 
                            : status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.authCreatedAt?.toLocaleDateString() || 'N/A'}
                      </td>
                      {isMainDomain && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.tenant || 'N/A'}</td>
                      )}
                      {isMainDomain && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View Details
                        </button>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Details Modal */}
        {isMainDomain && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Student Details: {selectedStudent.personal.name}
                  </h2>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Personal Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedStudent.personal.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedStudent.personal.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedStudent.personal.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="font-medium">{selectedStudent.personal.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date of Birth</p>
                      <p className="font-medium">{selectedStudent.personal.dob}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Assessment Status</p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        getAssessmentStatus(selectedStudent) === 'Completed'
                          ? 'bg-green-100 text-green-800' 
                          : getAssessmentStatus(selectedStudent) === 'In Progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {getAssessmentStatus(selectedStudent)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-500">UID</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm font-mono">
                          {selectedStudent.uid}
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedStudent.uid)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                        >
                          {copyStatus ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {copyStatus}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copy
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Educational Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">School</p>
                      <p className="text-sm font-medium">{selectedStudent.educational.school}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="text-sm font-medium">{selectedStudent.educational.studentClass}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">School Type</p>
                      <p className="text-sm font-medium">{selectedStudent.educational.schoolType}</p>
                    </div>
                    {selectedStudent.educational.fatherOccupation && (
                      <div>
                        <p className="text-sm text-gray-600">Father's Occupation</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.fatherOccupation}</p>
                      </div>
                    )}
                    {selectedStudent.educational.motherOccupation && (
                      <div>
                        <p className="text-sm text-gray-600">Mother's Occupation</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.motherOccupation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assessment Scores */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Scores</h3>
                  
                  {/* Ability Scores */}
                  {selectedStudent.abilityScores && (
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-700 mb-3">Ability Scores</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedStudent.abilityScores).map(([key, value]) => (
                          <div key={key} className="bg-white rounded-lg shadow p-3 border border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">{key.split(/(?=[A-Z])/).join(' ')}</div>
                            <div className="text-xl font-semibold text-indigo-600">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personality Scores */}
                  {selectedStudent.personalityScores && (
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-700 mb-3">Personality Scores</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedStudent.personalityScores).map(([key, value]) => (
                          <div key={key} className="bg-white rounded-lg shadow p-3 border border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">{key}</div>
                            <div className="text-xl font-semibold text-indigo-600">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multiple Intelligence Scores */}
                  {selectedStudent.multipleIntelligenceScores && (
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-3">Multiple Intelligence Scores</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedStudent.multipleIntelligenceScores).map(([key, value]) => (
                          <div key={key} className="bg-white rounded-lg shadow p-3 border border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">{key.split(/(?=[A-Z])/).join(' ')}</div>
                            <div className="text-xl font-semibold text-indigo-600">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-select Responses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Subjects of Interest */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Subjects of Interest</h4>
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.subjectsOfInterest?.map((subject) => (
                          <span
                            key={subject}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Values */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Values</h4>
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.values?.map((value) => (
                          <span
                            key={value}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Career Aspirations */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Career Aspirations</h4>
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.careerAspirations?.map((career) => (
                          <span
                            key={career}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                          >
                            {career}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedStudent.educational.topHighScoringSubjects && (
                      <div>
                        <p className="text-sm text-gray-600">Top High Scoring Subjects</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.topHighScoringSubjects}</p>
                      </div>
                    )}
                    {selectedStudent.educational.activities && (
                      <div>
                        <p className="text-sm text-gray-600">Activities</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.activities}</p>
                      </div>
                    )}
                    {selectedStudent.educational.awards && (
                      <div>
                        <p className="text-sm text-gray-600">Awards</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.awards}</p>
                      </div>
                    )}
                    {selectedStudent.educational.hobbies && (
                      <div>
                        <p className="text-sm text-gray-600">Hobbies</p>
                        <p className="text-sm font-medium">{selectedStudent.educational.hobbies}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 