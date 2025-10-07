// src/app/biz/[id]/program/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface Program {
  id: string;
  earn_rate_ppd: number;
  active: boolean;
}

export default function ProgramSettingsPage() {
  const params = useParams();
  const businessId = params.id as string;
  
  const [program, setProgram] = useState<Program | null>(null);
  const [earnRate, setEarnRate] = useState('5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
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

    // Verify access
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('email', user.email)
      .eq('business_id', businessId)
      .single();

    if (!businessUser) {
      router.push('/biz');
      return;
    }

    await loadProgram();
    setLoading(false);
  };

  const loadProgram = async () => {
    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (data) {
      setProgram(data);
      setEarnRate(data.earn_rate_ppd.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const rate = parseInt(earnRate);
      
      if (rate < 1 || rate > 100) {
        throw new Error('Earn rate must be between 1 and 100');
      }

      const { error } = await supabase
        .from('programs')
        .update({
          earn_rate_ppd: rate,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId);

      if (error) throw error;

      setMessage('✓ Settings saved successfully');
      await loadProgram();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/biz')}
            className="text-indigo-100 hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">Program Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg ${
            message.startsWith('✓') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Points Program</h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Earn Rate (Points per Dollar)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={earnRate}
                  onChange={(e) => setEarnRate(e.target.value)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                <span className="text-gray-600">points per $1 spent</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Example: If set to {earnRate}, a $10 purchase earns {parseInt(earnRate) * 10} points
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Customers earn points automatically when staff scans their QR</li>
                <li>• Points = floor(bill amount × earn rate)</li>
                <li>• Higher rates = more generous rewards</li>
                <li>• Typical range: 5-20 points per dollar</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}