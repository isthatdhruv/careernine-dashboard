'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type OrphanedUser = {
  uid: string;
  email: string;
  displayName: string;
  creationTime: string | null;
  lastSignInTime: string | null;
  disabled: boolean;
};

type FirestoreOnlyUser = {
  uid: string;
  email: string;
  name: string;
  createdAt: string | null;
};

type OrphanedUsersResponse = {
  orphanedUsers: OrphanedUser[];
  firestoreOrphans?: FirestoreOnlyUser[];
  totals: {
    authUsers: number;
    firestoreUsers: number;
    orphanedUsers: number;
    firestoreOnlyUsers?: number;
  };
};

const MAIN_ADMIN_SUBDOMAINS = ['localhost', 'analyze', ''];
const SUPER_ADMIN_PASSWORD = 'admin2024';
const CACHE_KEY = 'orphanedUsersCache';

const persistCache = (payload: {
  orphanedUsers: OrphanedUser[];
  firestoreOnlyUsers: FirestoreOnlyUser[];
  totals: OrphanedUsersResponse['totals'] | null;
  timestamp: string;
}) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist orphaned users cache:', error);
  }
};

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

const formatDate = (value: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const OrphanedUsersPage = () => {
  const [isSuperAdminDomain, setIsSuperAdminDomain] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [totals, setTotals] = useState<OrphanedUsersResponse['totals'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [firestoreOnlyUsers, setFirestoreOnlyUsers] = useState<FirestoreOnlyUser[]>([]);

  const orphanedUsersRef = useRef<OrphanedUser[]>([]);
  const totalsRef = useRef<OrphanedUsersResponse['totals'] | null>(null);
  const firestoreOnlyUsersRef = useRef<FirestoreOnlyUser[]>([]);

  useEffect(() => {
    const subdomain = getSubdomain();
    setIsSuperAdminDomain(MAIN_ADMIN_SUBDOMAINS.includes(subdomain));

    if (MAIN_ADMIN_SUBDOMAINS.includes(subdomain) && typeof window !== 'undefined') {
      const isAdminAuthenticated = localStorage.getItem('adminAuthenticated');
      if (isAdminAuthenticated === 'true') {
        setAuthenticated(true);
      }
    }
  }, []);

  useEffect(() => {
    orphanedUsersRef.current = orphanedUsers;
  }, [orphanedUsers]);

  useEffect(() => {
    totalsRef.current = totals;
  }, [totals]);

  useEffect(() => {
    firestoreOnlyUsersRef.current = firestoreOnlyUsers;
  }, [firestoreOnlyUsers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (!cachedRaw) return;
      const cached = JSON.parse(cachedRaw);

      if (Array.isArray(cached.orphanedUsers)) {
        setOrphanedUsers(cached.orphanedUsers);
        orphanedUsersRef.current = cached.orphanedUsers;
      }

      if (Array.isArray(cached.firestoreOnlyUsers)) {
        setFirestoreOnlyUsers(cached.firestoreOnlyUsers);
        firestoreOnlyUsersRef.current = cached.firestoreOnlyUsers;
      }

      if (cached.totals) {
        setTotals(cached.totals);
        totalsRef.current = cached.totals;
      }

      if (cached.timestamp) {
        const parsed = new Date(cached.timestamp);
        setLastUpdated(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
      }

      if (cached.orphanedUsers?.length > 0 || cached.firestoreOnlyUsers?.length > 0) {
        setLoading(false);
      }
    } catch (cacheError) {
      console.warn('Failed to load orphaned users cache:', cacheError);
    }
  }, []);

  const fetchOrphanedUsers = useCallback(async () => {
    const hasExistingData = orphanedUsersRef.current.length > 0;
    const showFullScreenSpinner = !hasExistingData;

    if (showFullScreenSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    setSlowLoading(false);

    let slowTimer: number | undefined;
    if (typeof window !== 'undefined') {
      slowTimer = window.setTimeout(() => {
        setSlowLoading(true);
      }, 4000);
    }

    try {
      const response = await fetch('/api/admin/orphaned-users');
      if (!response.ok) {
        throw new Error('Failed to fetch orphaned users');
      }

      const data: OrphanedUsersResponse = await response.json();
      const firestoreOrphans = data.firestoreOrphans ?? [];

      setOrphanedUsers(data.orphanedUsers);
      orphanedUsersRef.current = data.orphanedUsers;

      setFirestoreOnlyUsers(firestoreOrphans);
      firestoreOnlyUsersRef.current = firestoreOrphans;

      setTotals(data.totals);
      totalsRef.current = data.totals;

      const timestamp = new Date();
      setLastUpdated(timestamp);

      persistCache({
        orphanedUsers: data.orphanedUsers,
        firestoreOnlyUsers: firestoreOrphans,
        totals: data.totals,
        timestamp: timestamp.toISOString(),
      });

      setSelectedUids((prev) => {
        const next = new Set<string>();
        const validIds = new Set(data.orphanedUsers.map((user) => user.uid));
        prev.forEach((uid) => {
          if (validIds.has(uid)) {
            next.add(uid);
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Error fetching orphaned users:', err);
      setError('Unable to load orphaned users. Please try again.');
    } finally {
      if (typeof window !== 'undefined' && slowTimer) {
        window.clearTimeout(slowTimer);
      }
      setSlowLoading(false);
      if (showFullScreenSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authenticated && isSuperAdminDomain) {
      fetchOrphanedUsers();
    }
  }, [authenticated, fetchOrphanedUsers, isSuperAdminDomain]);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSuperAdminDomain) {
      setError('This page is only available on the master admin domain.');
      return;
    }

    if (password === SUPER_ADMIN_PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setPassword('');
      setError(null);
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    setOrphanedUsers([]);
    orphanedUsersRef.current = [];
    setTotals(null);
    setSelectedUids(new Set());
    setTimeFilter('all');
    setLastUpdated(null);
    setFirestoreOnlyUsers([]);
    firestoreOnlyUsersRef.current = [];
    setPassword('');
    setError(null);
  };

  const deleteUsers = async (uids: string[]) => {
    if (uids.length === 0) {
      return;
    }

    const summary =
      uids.length === 1
        ? (() => {
            const target = orphanedUsersRef.current.find((user) => user.uid === uids[0]);
            const email = target?.email || uids[0];
            return `UID: ${uids[0]}\nEmail: ${email}`;
          })()
        : `${uids.length} users selected`;

    const confirmDelete = window.confirm(
      `Delete orphaned user${uids.length > 1 ? 's' : ''}?\n\n${summary}\n\nThis removes the Firebase Auth user${
        uids.length > 1 ? 's' : ''
      } and any partial Firestore document.`
    );

    if (!confirmDelete) return;

    try {
      if (uids.length === 1) {
        setDeletingUid(uids[0]);
      } else {
        setBulkDeleting(true);
      }
      setError(null);

      const failed: string[] = [];
      const successful: string[] = [];

      for (const uid of uids) {
        try {
          const response = await fetch('/api/admin/orphaned-users', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const message = payload?.error || 'Failed to delete user';
            throw new Error(message);
          }

          successful.push(uid);
        } catch (deleteErr) {
          console.error(`Error deleting orphaned user ${uid}:`, deleteErr);
          failed.push(uid);
        }
      }

      if (successful.length > 0) {
        let updatedUsers: OrphanedUser[] | null = null;
        setOrphanedUsers((prev) => {
          const next = prev.filter((user) => !successful.includes(user.uid));
          updatedUsers = next;
          return next;
        });
        orphanedUsersRef.current = orphanedUsersRef.current.filter(
          (user) => !successful.includes(user.uid)
        );

        setSelectedUids((prev) => {
          const next = new Set(prev);
          successful.forEach((uid) => next.delete(uid));
          return next;
        });

        let updatedTotals: OrphanedUsersResponse['totals'] | null = null;
        setTotals((prev) => {
          if (!prev) return prev;
          updatedTotals = {
            ...prev,
            authUsers: Math.max(prev.authUsers - successful.length, 0),
            orphanedUsers: Math.max(prev.orphanedUsers - successful.length, 0),
          };
          return updatedTotals;
        });

        const timestamp = new Date();
        setLastUpdated(timestamp);

        persistCache({
          orphanedUsers: updatedUsers ?? orphanedUsersRef.current,
        firestoreOnlyUsers: firestoreOnlyUsersRef.current,
          totals: updatedTotals ?? totalsRef.current,
          timestamp: timestamp.toISOString(),
        });
      }

      if (failed.length > 0) {
        setError(`Failed to delete ${failed.length} user${failed.length > 1 ? 's' : ''}. Please retry.`);
      }
    } catch (err) {
      console.error('Error deleting orphaned user:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete orphaned user. Please try again.'
      );
    } finally {
      setDeletingUid(null);
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    await deleteUsers([uid]);
  };

  const handleBulkDelete = async () => {
    if (selectedUids.size === 0) return;
    await deleteUsers(Array.from(selectedUids));
  };

  const handleDeleteAllVisible = async () => {
    if (filteredUsers.length === 0) return;
    await deleteUsers(filteredUsers.map((user) => user.uid));
  };

  const handleDeleteFirestoreOnly = async (uid: string) => {
    const target = firestoreOnlyUsersRef.current.find((user) => user.uid === uid);
    const emailOrUid = target?.email || uid;
    if (
      !window.confirm(
        `Delete Firestore profile without auth?\n\nUID: ${uid}\nEmail: ${emailOrUid}\n\nThis only removes the Firestore document.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/admin/orphaned-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, target: 'firestore' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete Firestore profile');
      }

      setFirestoreOnlyUsers((prev) => prev.filter((user) => user.uid !== uid));
      firestoreOnlyUsersRef.current = firestoreOnlyUsersRef.current.filter((user) => user.uid !== uid);

      setTotals((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          firestoreOnlyUsers: firestoreOnlyUsersRef.current.length,
        };
        totalsRef.current = updated;
        return updated;
      });

      const timestamp = new Date();
      setLastUpdated(timestamp);

      persistCache({
        orphanedUsers: orphanedUsersRef.current,
        firestoreOnlyUsers: firestoreOnlyUsersRef.current,
        totals: totalsRef.current,
        timestamp: timestamp.toISOString(),
      });
    } catch (err) {
      console.error('Error deleting Firestore-only user:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete Firestore-only profile. Please try again.'
      );
    }
  };

  const stats = useMemo(() => {
    if (!totals) {
      return [
        { label: 'Auth Users', value: '—' },
        { label: 'Firestore Users', value: '—' },
        { label: 'Auth Without Profile', value: '—' },
        { label: 'Profile Without Auth', value: '—' },
      ];
    }

    return [
      { label: 'Auth Users', value: totals.authUsers.toString() },
      { label: 'Firestore Users', value: totals.firestoreUsers.toString() },
      { label: 'Auth Without Profile', value: totals.orphanedUsers.toString() },
      {
        label: 'Profile Without Auth',
        value: (totals.firestoreOnlyUsers ?? firestoreOnlyUsers.length).toString(),
      },
    ];
  }, [totals, firestoreOnlyUsers.length]);

  const matchesTimeFilter = useCallback((user: OrphanedUser) => {
    if (timeFilter === 'all') return true;
    if (!user.creationTime) return false;

    const createdAt = new Date(user.creationTime);
    if (Number.isNaN(createdAt.getTime())) return false;

    const now = new Date();
    const millisInDay = 24 * 60 * 60 * 1000;

    if (timeFilter === 'day') {
      return now.getTime() - createdAt.getTime() <= millisInDay;
    }
    if (timeFilter === 'week') {
      return now.getTime() - createdAt.getTime() <= millisInDay * 7;
    }
    if (timeFilter === 'month') {
      return now.getTime() - createdAt.getTime() <= millisInDay * 30;
    }

    return true;
  }, [timeFilter]);

  const filteredUsers = useMemo(() => {
    return orphanedUsers.filter((user) => matchesTimeFilter(user));
  }, [orphanedUsers, matchesTimeFilter]);

  const allVisibleSelected =
    filteredUsers.length > 0 && filteredUsers.every((user) => selectedUids.has(user.uid));

  const toggleSelectAllVisible = () => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredUsers.forEach((user) => next.delete(user.uid));
      } else {
        filteredUsers.forEach((user) => next.add(user.uid));
      }
      return next;
    });
  };

  const toggleSelection = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  if (!isSuperAdminDomain) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restricted Access</h1>
          <p className="text-gray-600">
            The orphaned users dashboard is available only on the master admin domain.
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Super Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter super admin password"
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orphaned Users Dashboard</h1>
            <p className="text-gray-600">
              Review orphaned Firebase Auth users (no matching Firestore `users` document) and remove
              them safely.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrphanedUsers}
              disabled={loading || refreshing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && orphanedUsers.length === 0
                ? 'Loading...'
                : refreshing || loading
                  ? 'Refreshing...'
                  : 'Refresh'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedUids.size === 0 || bulkDeleting || loading || refreshing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedUids.size || 0})`}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {slowLoading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded text-sm">
            Still scanning all Firebase Auth users… large directories can take a little longer.
          </div>
        )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detected Orphaned Users</h2>
            <p className="text-sm text-gray-500">
              These accounts exist in Firebase Auth but do not have a matching Firestore document.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3 sm:flex-row sm:gap-4">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="timeFilter" className="text-gray-600">
                Created within
              </label>
              <select
                id="timeFilter"
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value as typeof timeFilter)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="all">All time</option>
                <option value="day">Last 24 hours</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {loading && orphanedUsers.length === 0
                ? 'Scanning Firebase Auth users…'
                : loading || refreshing
                  ? 'Refreshing…'
                  : `Showing ${filteredUsers.length} orphaned user${filteredUsers.length === 1 ? '' : 's'} • Last refresh: ${
                      lastUpdated ? lastUpdated.toLocaleTimeString() : '—'
                    }`}
            </div>
            <button
              onClick={handleDeleteAllVisible}
              disabled={filteredUsers.length === 0 || bulkDeleting || loading || refreshing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleting ? 'Deleting…' : `Delete All Visible (${filteredUsers.length})`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sign-In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No orphaned users detected. Great job!
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUids.has(user.uid)}
                        onChange={() => toggleSelection(user.uid)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        aria-label={`Select ${user.email || user.uid}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.email || 'No email'}
                      </div>
                      {user.displayName && (
                        <div className="text-sm text-gray-500">{user.displayName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs text-gray-600 break-all max-w-[220px]">
                        {user.uid}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.creationTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.lastSignInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.disabled
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(user.uid)}
                        disabled={deletingUid === user.uid}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingUid === user.uid ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {loading && orphanedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading orphaned users…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {firestoreOnlyUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profiles Without Auth Accounts</h2>
              <p className="text-sm text-gray-500">
                These Firestore `users` documents no longer have a matching Firebase Auth user. They can be safely removed.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {firestoreOnlyUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email || 'No email'}</div>
                      <div className="text-xs text-gray-500">{user.uid}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteFirestoreOnly(user.uid)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default OrphanedUsersPage;