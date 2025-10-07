// src/app/biz/[id]/ledger/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface LedgerEntry {
  id: string;
  created_at: string;
  user_phone: string;
  delta_points: number;
  amount_cents?: number;
  reason: string;
  notes?: string;
}

export default function LedgerPage() {
  const params = useParams();
  const businessId = params.id as string;
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earn' | 'redeem'>('all');
  
  const supabase = createClientBrowser();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadLedger();
    }
  }, [filter, loading]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/biz/login');
      return;
    }

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

    setLoading(false);
  };

  const loadLedger = async () => {
    let query = supabase
      .from('point_ledger')
      .select(`
        id,
        created_at,
        delta_points,
        amount_cents,
        reason,
        notes,
        users (
          phone
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('reason', filter);
    }

    const { data } = await query;

    if (data) {
      const formatted = data.map((entry: any) => ({
        id: entry.id,
        created_at: entry.created_at,
        user_phone: entry.users?.phone || 'Unknown',
        delta_points: entry.delta_points,
        amount_cents: entry.amount_cents,
        reason: entry.reason,
        notes: entry.notes,
      }));
      setEntries(formatted);
    }
  };

  const handleExport = async () => {
    // Simple CSV export
    const csv = [
      ['Date', 'Customer', 'Points', 'Amount', 'Type', 'Notes'].join(','),
      ...entries.map(e => [
        new Date(e.created_at).toLocaleString(),
        e.user_phone,
        e.delta_points,
        e.amount_cents ? `$${(e.amount_cents / 100).toFixed(2)}` : '',
        e.reason,
        e.notes || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${businessId}-${Date.now()}.csv`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/biz')}
              className="text-indigo-100 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Transaction Ledger</h1>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('earn')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'earn'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Earn
            </button>
            <button
              onClick={() => setFilter('redeem')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'redeem'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Redeem
            </button>
          </div>
        </div>

        {/* Ledger Entries */}
        {entries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.user_phone}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.reason === 'earn'
                            ? 'bg-green-100 text-green-800'
                            : entry.reason === 'redeem'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.reason}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        entry.delta_points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.delta_points > 0 ? '+' : ''}{entry.delta_points}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {entry.amount_cents ? `$${(entry.amount_cents / 100).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {entry.notes || '-'}
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
}