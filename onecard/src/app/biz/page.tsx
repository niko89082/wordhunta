// src/app/biz/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Business {
  id: string;
  name: string;
  logo_url?: string;
}

export default function BusinessDashboard() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const supabase = createClientBrowser();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/biz/login');
      return;
    }

    setUser(user);
    await loadBusinesses(user);
    setLoading(false);
  };

  const loadBusinesses = async (user: any) => {
    // Get businesses where user is staff/owner
    const { data: businessUsers } = await supabase
      .from('business_users')
      .select('business_id, businesses (id, name, logo_url)')
      .eq('email', user.email);

    if (businessUsers) {
      const bizList = businessUsers
        .map((bu: any) => bu.businesses)
        .filter(Boolean);
      setBusinesses(bizList);
    }

    // Also get businesses where user is owner
    const { data: ownedBusinesses } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('owner_user_id', user.id);

    if (ownedBusinesses) {
      const combined = [...businesses, ...ownedBusinesses];
      const unique = Array.from(new Map(combined.map(b => [b.id, b])).values());
      setBusinesses(unique);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName || !user) return;

    setCreating(true);

    try {
      // Create business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: newBusinessName,
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (bizError) throw bizError;

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
          email: user.email,
          role: 'owner',
        });

      if (userError) throw userError;

      // Reload businesses
      await loadBusinesses(user);
      setNewBusinessName('');
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Error creating business:', error);
      alert(error.message || 'Failed to create business');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/biz/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Business Dashboard</h1>
            <p className="text-sm text-indigo-100">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-100 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Create Business Button */}
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition"
          >
            + Create New Business
          </button>
        )}

        {/* Create Business Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Business</h2>
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="Joe's Coffee Shop"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBusinessName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Businesses List */}
        {businesses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">No businesses yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {business.logo_url && (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <h3 className="text-xl font-semibold">{business.name}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push(`/biz/${business.id}/staff`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Staff Terminal
                  </button>
                  <button
                    onClick={() => router.push(`/biz/${business.id}/program`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => router.push(`/biz/${business.id}/rewards`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Rewards
                  </button>
                  <button
                    onClick={() => router.push(`/biz/${business.id}/ledger`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Ledger
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}