// src/app/biz/[id]/staff/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import CameraScanner from '@/components/scan/CameraScanner';

interface Customer {
  id: string;
  phone: string;
}

interface Business {
  id: string;
  name: string;
  earn_rate: number;
}

export default function StaffPage() {
  const params = useParams();
  const businessId = params.id as string;
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState<'scan' | 'earn' | 'redeem'>('scan');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
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

    // Verify user has access to this business
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

    await loadBusiness();
  };

  const loadBusiness = async () => {
    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    const { data: programData } = await supabase
      .from('programs')
      .select('earn_rate_ppd')
      .eq('business_id', businessId)
      .eq('active', true)
      .single();

    if (businessData && programData) {
      setBusiness({
        id: businessData.id,
        name: businessData.name,
        earn_rate: programData.earn_rate_ppd,
      });
    }
  };

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'customer') {
        loadCustomer(parsed.userId);
        setMode('earn');
      } else if (parsed.type === 'redeem') {
        handleRedeemScan(parsed.token);
      }
    } catch (err) {
      setMessage('Invalid QR code');
    }
  };

  const loadCustomer = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, phone')
      .eq('id', userId)
      .single();

    if (data) {
      setCustomer(data);
    }
  };

  const handlePhoneLookup = async () => {
    if (!phoneInput) return;

    const cleanPhone = phoneInput.replace(/\D/g, '');
    const formattedPhone = `+${cleanPhone}`;

    const { data } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', formattedPhone)
      .single();

    if (data) {
      setCustomer(data);
      setMode('earn');
      setPhoneInput('');
    } else {
      setMessage('Customer not found');
    }
  };

  const handleEarn = async () => {
    if (!customer || !amount || !business) return;

    setLoading(true);
    setMessage('');

    try {
      const amountCents = Math.floor(parseFloat(amount) * 100);
      
      const response = await fetch('/api/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: customer.id,
          business_id: business.id,
          amount_cents: amountCents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to credit points');
      }

      setMessage(`✓ Credited ${data.points_earned} points!`);
      setAmount('');
      
      setTimeout(() => {
        setCustomer(null);
        setMode('scan');
        setMessage('');
      }, 2000);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemScan = async (token: string) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/redeem/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redeem_token: token,
          business_id: businessId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem');
      }

      setMessage(`✓ Redeemed: ${data.reward_label}`);
      
      setTimeout(() => {
        setMode('scan');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setMessage(err.message);
      setTimeout(() => {
        setMode('scan');
        setMessage('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">{business.name}</h1>
          <p className="text-sm text-indigo-100">Staff Terminal</p>
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

        {mode === 'scan' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold">Scan Customer QR</h2>
            
            <CameraScanner onScan={handleScan} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or enter phone</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 (555) 555-5555"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handlePhoneLookup}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Lookup
              </button>
            </div>
          </div>
        )}

        {mode === 'earn' && customer && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Credit Points</h2>
              <p className="text-sm text-gray-600">Customer: {customer.phone}</p>
              <p className="text-sm text-gray-500">Earn rate: {business.earn_rate} pts/$1</p>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Bill Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-2xl"
                autoFocus
              />
              {amount && (
                <p className="text-sm text-gray-600 mt-2">
                  Will earn: {Math.floor(parseFloat(amount || '0') * business.earn_rate)} points
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCustomer(null);
                  setMode('scan');
                  setAmount('');
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEarn}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Credit Points'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}