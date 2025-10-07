// src/components/scan/CameraScanner.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface CameraScannerProps {
  onScan: (data: string) => void;
}

export default function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        setError('');
        tick();
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setScanning(false);
  };

  const tick = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          onScan(code.data);
          stopScanning();
          return;
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="space-y-4">
      {!scanning ? (
        <button
          onClick={startScanning}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Open Camera
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full"
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-white/50 rounded-lg" />
            </div>
          </div>
          <button
            onClick={stopScanning}
            className="w-full py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel Scan
          </button>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Note: Install jsqr package
// npm install jsqr
// npm install --save-dev @types/jsqr