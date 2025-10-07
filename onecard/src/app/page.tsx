// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold text-gray-900">OneCard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/biz/login')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Business Login
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            One Card.<br />Every Restaurant.
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The universal loyalty program for local restaurants. Earn points, redeem rewards, all from your phone.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition"
            >
              Customer Login
            </button>
            <button
              onClick={() => router.push('/biz/signup')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg text-lg font-medium hover:border-gray-400 transition"
            >
              For Businesses
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">One App, All Places</h3>
            <p className="text-gray-600">
              No more juggling multiple loyalty cards. One app for all your favorite local spots.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Points</h3>
            <p className="text-gray-600">
              Show your QR at checkout. Points are credited automatically based on your spend.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎁</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Rewards</h3>
            <p className="text-gray-600">
              Redeem rewards with a tap. No paper coupons, no hassle, just instant gratification.
            </p>
          </div>
        </div>

        {/* For Businesses */}
        <div className="bg-white rounded-2xl p-12 shadow-sm">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              For Restaurant Owners
            </h3>
            <p className="text-lg text-gray-600 mb-8">
              Drive repeat visits with a loyalty program that's simple to set up and easy to manage. No hardware required.
            </p>
            <ul className="text-left space-y-3 mb-8 max-w-xl mx-auto">
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700">Set up in minutes, no technical knowledge needed</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700">Staff uses their phone or tablet - no new hardware</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700">Track customer engagement and transaction history</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <span className="text-gray-700">Flexible rewards - you control the earn rate and catalog</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/biz/signup')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-medium hover:bg-indigo-700 transition"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-500 text-sm">
          <p>© 2025 OneCard. Universal loyalty for local restaurants.</p>
        </footer>
      </div>
    </div>
  );
}