// src/components/qr/CustomerQR.tsx
'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface CustomerQRProps {
  userId: string;
  redeemToken?: string; // Optional: for one-time redeem QR
}

export default function CustomerQR({ userId, redeemToken }: CustomerQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQR();
  }, [userId, redeemToken]);

  const generateQR = async () => {
    if (!canvasRef.current) return;

    const data = redeemToken 
      ? JSON.stringify({ type: 'redeem', token: redeemToken })
      : JSON.stringify({ type: 'customer', userId });

    try {
      await QRCode.toCanvas(canvasRef.current, data, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="border-4 border-gray-200 rounded-lg" />
      {redeemToken && (
        <p className="text-xs text-gray-500 mt-2">
          Show this to staff to redeem
        </p>
      )}
    </div>
  );
}

// Note: Install qrcode package
// npm install qrcode
// npm install --save-dev @types/qrcode