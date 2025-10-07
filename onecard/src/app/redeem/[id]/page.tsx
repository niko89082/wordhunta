// src/app/redeem/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import CustomerQR from '@/components/qr/CustomerQR';

interface Reward {
  id: string;
  business_id: string;
  business_name: string;
  label: string;
  description?: string;
  cost_points: number;
}

export default function RedeemPage() {
  const params = useParams();
  const rewardId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [redeemToken, setRedeemToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const supabase = createClientBrowser();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;

    const checkExpiry = setInterval(() => {
      if (new Date() > expiresAt) {
        setRedeemToken(null);
        setError('Redeem code expired. Generate a new one.');
      }
    }, 1000);

    return () => clearInterval(checkExpiry);
  }, [expiresAt]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
    await loadReward(user.id);
    setLoading(false);
  };

  const loadReward = async (userId: string) => {
    // Load reward details
    const { data: rewardData, error: rewardError } = await supabase
      .from('rewards_catalog')
      .select(`
        id,
        business_id,
        label,
        description,
        cost_points,
        businesses (
          name
        )
      `)
      .eq('id', rewardId)
      .single();

    if (rewardError || !rewardData) {
      setError('Reward not found');
      return;
    }

    const formattedReward = {
      id: rewardData.id,
      business_id: rewardData.business_id,
      business_name: rewardData.businesses?.name || 'Unknown',
      label: rewardData.label,
      description: rewardData.description,
      cost_points: rewardData.cost_points,
    };

    setReward(formattedReward);

    // Load user's balance for this business
    const { data: balanceData } = await supabase
      .from('v_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('business_id', formattedReward.business_id)
      .single();

    setBalance(balanceData?.balance || 0);
  };

  const handleGenerateRedeem = async () => {
    if (!user || !reward) return;
    
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/redeem/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          reward_id: reward.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate redeem code');
      }

      setRedeemToken(data.redeem_token);
      setExpiresAt(new Date(data.expires_at));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !reward) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-md w-full">
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => router.push('/wallet')}
            className="mt-4 w-full py-2 text-blue-600 hover:text-blue-700"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  const canRedeem = balance >= (reward?.cost_points || 0);
  const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/wallet')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Redeem Reward</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Reward Details */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{reward?.label}</h2>
            <p className="text-gray-600">{reward?.business_name}</p>
            {reward?.description && (
              <p className="text-gray-500 mt-2">{reward.description}</p>
            )}
          </div>

          {/* Points Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Required Points:</span>
              <span className="font-bold text-gray-900">{reward?.cost_points} pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Your Balance:</span>
              <span className={`font-bold ${canRedeem ? 'text-green-600' : 'text-red-600'}`}>
                {balance} pts
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Redeem QR or Generate Button */}
          {redeemToken ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 text-center font-medium mb-4">
                  Show this QR to staff
                </p>
                <CustomerQR userId={user.id} redeemToken={redeemToken} />
                <p className="text-center text-sm text-gray-600 mt-4">
                  Expires in: <span className="font-bold">{timeRemaining}s</span>
                </p>
              </div>
              <button
                onClick={() => setRedeemToken(null)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateRedeem}
              disabled={!canRedeem || loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg"
            >
              {canRedeem ? 'Generate Redeem Code' : 'Insufficient Points'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}