# Career Navigator 360 Assessment Platform

A comprehensive career assessment and guidance platform built with Next.js, Firebase, and Razorpay.

## Features

- User registration and authentication with Firebase
- Comprehensive career assessment sections with specialized quizzes
- Payment processing with Razorpay integration
- Coupon code functionality for discounts
- Counseling appointment scheduling via Calendly integration
- Responsive UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- Firebase account
- Razorpay account (for payment processing)
- Calendly account (optional, for appointment scheduling)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd assessment
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file in the project root with the following variables:

```
# Firebase Configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key content here\n-----END PRIVATE KEY-----\n"

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
NEXT_PUBLIC_RAZORPAY_KEY=your-razorpay-key-id

# Calendly API (Optional)
CALENDLY_API_KEY=your-calendly-api-key
CALENDLY_ORGANIZATION=your-calendly-organization-uri
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Create a Firestore database with the following collections:
   - `users`: User profiles and assessment data
   - `settings`: Application settings including `pricing` and `plans` documents
   - `coupons`: Coupon codes for discounts
   - `payments`: Record of payment transactions

4. Set up Firestore security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /settings/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /coupons/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Deployment

Build the production version:

```bash
npm run build
```

Deploy to your hosting provider of choice. For Firebase Hosting:

```bash
firebase deploy
```

## Project Structure

- `/app`: Next.js App Router
  - `/api`: API routes for backend functionality
  - `/components`: Reusable React components
  - `/dashboard`, `/login`, etc.: Page components
  - `/utils`: Utility functions and defaults
  - `/lib`: Firebase and other service configurations


