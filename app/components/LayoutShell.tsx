// app/components/LayoutShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// Add dashboard-related routes to exclusion list
const authRoutes = ['/login', '/register', '/forgot-password'];

const LayoutShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isAuthPage = authRoutes.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && <Header />}
      <main className={`flex-grow ${isAuthPage ? '' : 'pt-0'}`}>
        {children}
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default LayoutShell;
