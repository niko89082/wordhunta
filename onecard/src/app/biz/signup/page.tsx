// src/app/biz/signup/page.tsx
'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BusinessSignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClientBrowser();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create auth user
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;

      if (!data.user) {
        throw new Error('Failed to create user');
      }

      // Create business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: formData.businessName,
          owner_user_id: data.user.id,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Create default program
      const { error: programError } = await supabase
        .from('programs')
        .insert({
          business_id: business.id,
          earn_rate_ppd: 5,
          active: true,
        });

      if (programError) throw programError;

      // Add owner as business user
      const { error: userError } = await supabase
        .from('business_users')
        .insert({
          business_id: business.id,
          email: formData.email,
          role: 'owner',
        });

      if (userError) throw userError;

      // Success - redirect to dashboard
      router.push('/biz');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Business Account</h1>
          <p className="text-gray-600">Start your loyalty program today</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Joe's Coffee Shop"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="owner@restaurant.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/biz/login" className="text-sm text-indigo-600 hover:text-indigo-700">
            Already have an account? Login
          </a>
        </div>
      </div>
    </div>
  );
}