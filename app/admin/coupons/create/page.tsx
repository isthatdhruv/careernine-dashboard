'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

const CreateCouponPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    setPrice: '',
    plan: '',
    expiryDate: '',
    maxUses: '1000',
    description: ''
  });

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = () => {
      const isAdmin = localStorage.getItem('adminAuth');
      if (!isAdmin) {
        router.push('/admin/login');
        return;
      }
    };

    checkAdminAccess();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.code.trim()) {
        throw new Error('Coupon code is required');
      }

      if (formData.discountType === 'setPrice') {
        if (!formData.setPrice || isNaN(Number(formData.setPrice)) || Number(formData.setPrice) <= 0) {
          throw new Error('Set price must be a valid number greater than 0');
        }
      } else {
        if (!formData.discountValue || isNaN(Number(formData.discountValue)) || Number(formData.discountValue) <= 0) {
          throw new Error('Discount value must be a valid number greater than 0');
        }
        if (formData.discountType === 'percentage' && Number(formData.discountValue) > 100) {
          throw new Error('Percentage discount cannot be more than 100%');
        }
      }

      if (!formData.expiryDate) {
        throw new Error('Expiry date is required');
      }

      if (!formData.maxUses || isNaN(Number(formData.maxUses)) || Number(formData.maxUses) <= 0) {
        throw new Error('Maximum uses must be a valid number greater than 0');
      }

      const couponData = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        ...(formData.discountType === 'setPrice' 
          ? { setPrice: Math.round(Number(formData.setPrice) * 100) } // Convert to paise
          : formData.discountType === 'percentage'
          ? { discountValue: Number(formData.discountValue) } // Percentage as is
          : { discountValue: Math.round(Number(formData.discountValue) * 100) }), // Fixed amount to paise
        plan: formData.plan || null,
        expiryDate: new Date(formData.expiryDate),
        maxUses: Number(formData.maxUses),
        description: formData.description.trim(),
        createdAt: new Date()
      };

      console.log('Creating coupon with data:', couponData); // Debug log

      await addDoc(collection(db, 'coupons'), couponData);
      router.push('/admin/coupons');
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      setError(err.message || 'Error creating coupon. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Coupon</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Coupon Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Type</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="setPrice">Set Price</option>
              </select>
            </div>

            {formData.discountType === 'setPrice' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Set Price (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.setPrice}
                  onChange={(e) => setFormData({ ...formData, setPrice: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {formData.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={formData.discountType === 'percentage' ? "100" : undefined}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Plan (Optional)</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Plans</option>
                <option value="assessment">Assessment Plan</option>
                <option value="counselling">Counselling Plan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Maximum Uses</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin/coupons')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCouponPage; 