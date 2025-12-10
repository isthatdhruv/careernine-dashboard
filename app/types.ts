export interface UserData {
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
    fatherOccupation?: string;
    motherOccupation?: string;
    topHighScoringSubjects?: string;
    activities?: string;
    awards?: string;
    hobbies?: string;
  };
  payment: {
    selectedPlan: string;
    paymentStatus: string;
    couponCode?: string;
    amount: number;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    createdAt?: any; // Firestore timestamp
  };
  counselingAppointment?: {
    appointmentURI: string;
    scheduledAt: any; // Firestore timestamp
    inviteeURI: string; 
    status: 'scheduled' | 'canceled' | 'completed';
  };
  cardsStatus?: {
    subjectsOfInterest?: boolean;
    values?: boolean;
    ability?: boolean;
    personality?: boolean;
    multipleIntelligence?: boolean;
    careerAspirations?: boolean;
  };
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}
  