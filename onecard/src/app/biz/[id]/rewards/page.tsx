// src/app/biz/[id]/rewards/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface Reward {
  id: string;
  label: string;
  description?: string;
  cost_points: number;
  active: boolean;
}

export default function RewardsManagementPage() {
  const params = useParams();
  const businessId = params.id as string;
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    cost_points: '100',
  });
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

    await loadRewards();
    setLoading(false);
  };

  const loadRewards = async () => {
    const { data } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('business_id', businessId)
      .order('cost_points', { ascending: true });

    if (data) {
      setRewards(data);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingId(reward.id);
    setFormData({
      label: reward.label,
      description: reward.description || '',
      cost_points: reward.cost_points.toString(),
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      label: '',
      description: '',
      cost_points: '100',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const costPoints = parseInt(formData.cost_points);
      
      if (costPoints < 1) {
        throw new Error('Cost must be at least 1 point');
      }

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('rewards_catalog')
          .update({
            label: formData.label,
            description: formData.description || null,
            cost_points: costPoints,
          })
          .eq('id', editingId);

        if (error) throw error;
        setMessage('✓ Reward updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('rewards_catalog')
          .insert({
            business_id: businessId,
            label: formData.label,
            description: formData.description || null,
            cost_points: costPoints,
            active: true,
          });

        if (error) throw error;
        setMessage('✓ Reward created');
      }

      await loadRewards();
      handleCancel();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rewardId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('rewards_catalog')
      .update({ active: !currentActive })
      .eq('id', rewardId);

    if (!error) {
      await loadRewards();
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    const { error } = await supabase
      .from('rewards_catalog')
      .delete()
      .eq('id', rewardId);

    if (!error) {
      await loadRewards();
      setMessage('✓ Reward deleted');
      setTimeout(() => setMessage(''), 3000);
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
          <h1 className="text-xl font-bold">Rewards Catalog</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className={`px-4 py-3 rounded-lg ${
            message.startsWith('✓') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Add Reward Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition"
          >
            + Add New Reward
          </button>
        )}

        {/* Reward Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Reward' : 'New Reward'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Name
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Free Coffee"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any size, any style"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost (Points)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cost_points}
                  onChange={(e) => setFormData({ ...formData, cost_points: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rewards List */}
        {rewards.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">No rewards yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-lg shadow-sm p-4 ${
                  !reward.active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{reward.label}</h3>
                    {reward.description && (
                      <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-indigo-600 ml-4">
                    {reward.cost_points} pts
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(reward.id, reward.active)}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    {reward.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
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