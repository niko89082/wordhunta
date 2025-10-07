// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClientBrowser();
  const router = useRouter();

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX for US numbers
    if (digits.length <= 1) return digits;
    if (digits.length <= 4) return `+1 (${digits.slice(1)}`;
    if (digits.length <= 7) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  };

  const cleanPhone = (formatted: string) => {
    // Convert to E.164 format: +1XXXXXXXXXX
    const digits = formatted.replace(/\D/g, '');
    return `+${digits}`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanedPhone = cleanPhone(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanedPhone,
      });

      if (error) throw error;

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanedPhone = cleanPhone(phone);
      
      const { error, data } = await supabase.auth.verifyOtp({
        phone: cleanedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      // Create user record if doesn't exist
      if (data.user) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({ 
            id: data.user.id, 
            phone: cleanedPhone 
          }, { 
            onConflict: 'id' 
          });

        if (upsertError) console.error('User upsert error:', upsertError);
      }

      router.push('/wallet');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OneCard</h1>
          <p className="text-gray-600">Your universal loyalty wallet</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+1 (555) 555-5555"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit code sent to {phone}
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
              className="w-full text-gray-600 py-2 text-sm hover:text-gray-900 transition"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}