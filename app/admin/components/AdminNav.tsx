'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const MAIN_ADMIN_SUBDOMAINS = ['localhost', 'analyze', ''];

const getSubdomain = () => {
  if (typeof window === 'undefined') return '';
  const host = window.location.host;
  const [hostname] = host.split(':');
  const parts = hostname.split('.');

  if (hostname === 'localhost') return 'localhost';
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
  if (parts.length === 3) return parts[0];
  if (parts.length === 2) return '';
  return '';
};

const AdminNav = () => {
  const pathname = usePathname();
  const [isSuperAdminDomain, setIsSuperAdminDomain] = useState(false);

  useEffect(() => {
    setIsSuperAdminDomain(MAIN_ADMIN_SUBDOMAINS.includes(getSubdomain()));
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex space-x-8">
              <Link
                href="/admin/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/admin/dashboard')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              {isSuperAdminDomain && (
                <Link
                  href="/admin/orphaned-users"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin/orphaned-users')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Orphaned Users
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav; 