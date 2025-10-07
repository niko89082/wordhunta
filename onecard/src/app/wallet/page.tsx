// src/app/wallet/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CustomerQR from '@/components/qr/CustomerQR';

interface Balance {
  business_id: string;
  business_name: string;
  balance: number;
  logo_url?: string;
}

interface Reward {
  id: string;
  business_id: string;
  business_name: string;
  label: string;
  description?: string;
  cost_points: number;
}

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  
  const supabase = createClientBrowser();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
    await loadBalances(user.id);
    await loadRewards(user.id);
    setLoading(false);
  };

  const loadBalances = async (userId: string) => {
    // Get balances with business info
    const { data, error } = await supabase
      .from('v_balances')
      .select(`
        user_id,
        business_id,
        balance,
        businesses (
          name,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .gt('balance', 0);

    if (error) {
      console.error('Error loading balances:', error);
      return;
    }

    const formatted = (data || []).map((item: any) => ({
      business_id: item.business_id,
      business_name: item.businesses?.name || 'Unknown Business',
      balance: item.balance,
      logo_url: item.businesses?.logo_url,
    }));

    setBalances(formatted);
  };

  const loadRewards = async (userId: string) => {
    // Get available rewards from businesses where user has points
    const { data: balanceData } = await supabase
      .from('v_balances')
      .select('business_id, balance')
      .eq('user_id', userId)
      .gt('balance', 0);

    if (!balanceData || balanceData.length === 0) {
      setRewards([]);
      return;
    }

    const businessIds = balanceData.map(b => b.business_id);

    const { data: rewardsData, error } = await supabase
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
      .in('business_id', businessIds)
      .eq('active', true);

    if (error) {
      console.error('Error loading rewards:', error);
      return;
    }

    // Filter rewards user can afford
    const affordable = (rewardsData || [])
      .map((reward: any) => {
        const balance = balanceData.find(b => b.business_id === reward.business_id);
        return {
          id: reward.id,
          business_id: reward.business_id,
          business_name: reward.businesses?.name || 'Unknown',
          label: reward.label,
          description: reward.description,
          cost_points: reward.cost_points,
          canRedeem: balance ? balance.balance >= reward.cost_points : false,
        };
      })
      .sort((a, b) => {
        if (a.canRedeem !== b.canRedeem) return a.canRedeem ? -1 : 1;
        return a.cost_points - b.cost_points;
      });

    setRewards(affordable);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* QR Code Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Your QR Code</h2>
          <p className="text-sm text-gray-600 mb-4">
            Show this at checkout to earn and redeem points
          </p>
          
          {showQR ? (
            <div className="space-y-4">
              <CustomerQR userId={user.id} />
              <button
                onClick={() => setShowQR(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                Hide QR
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowQR(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Show My QR
            </button>
          )}
        </div>

        {/* Balances */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Points Balance</h2>
          
          {balances.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No points yet. Show your QR at a participating restaurant to start earning!
            </p>
          ) : (
            <div className="space-y-3">
              {balances.map((balance) => (
                <div
                  key={balance.business_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {balance.logo_url && (
                      <img
                        src={balance.logo_url}
                        alt={balance.business_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium text-gray-900">
                      {balance.business_name}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {balance.balance} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Rewards */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Available Rewards</h2>
          
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Earn more points to unlock rewards!
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward: any) => (
                <button
                  key={reward.id}
                  onClick={() => reward.canRedeem && router.push(`/redeem/${reward.id}`)}
                  disabled={!reward.canRedeem}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    reward.canRedeem
                      ? 'border-blue-200 bg-blue-50 hover:border-blue-400 cursor-pointer'
                      : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{reward.label}</h3>
                      <p className="text-sm text-gray-600">{reward.business_name}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {reward.cost_points} pts
                    </span>
                  </div>
                  {reward.description && (
                    <p className="text-sm text-gray-500 mt-2">{reward.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}