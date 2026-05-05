import { useEffect, useState } from 'react';

export default function LoadingLion({ message = "Chargement en cours..." }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" data-testid="loading-lion">
      <div className="text-center">
        {/* Golden Lion Animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Lion Head SVG */}
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full animate-pulse"
            style={{ filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.5))' }}
          >
            {/* Mane */}
            <circle cx="50" cy="50" r="45" fill="url(#goldGradient)" className="animate-spin-slow" style={{ transformOrigin: 'center', animationDuration: '8s' }} />
            <circle cx="50" cy="50" r="38" fill="#0a0a0a" />
            
            {/* Face */}
            <circle cx="50" cy="52" r="30" fill="url(#goldGradient)" />
            
            {/* Eyes */}
            <ellipse cx="40" cy="48" rx="5" ry="6" fill="#0a0a0a" />
            <ellipse cx="60" cy="48" rx="5" ry="6" fill="#0a0a0a" />
            <circle cx="41" cy="47" r="2" fill="#d4af37" className="animate-pulse" />
            <circle cx="61" cy="47" r="2" fill="#d4af37" className="animate-pulse" />
            
            {/* Nose */}
            <path d="M45 58 L50 65 L55 58 Z" fill="#8B6914" />
            
            {/* Mouth */}
            <path d="M42 68 Q50 75 58 68" stroke="#8B6914" strokeWidth="2" fill="none" />
            
            {/* Crown */}
            <path d="M30 25 L35 35 L42 28 L50 38 L58 28 L65 35 L70 25 L68 40 L32 40 Z" fill="url(#goldGradient)" />
            
            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5d742" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#a67c00" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Building blocks animation */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            <div className="w-3 h-3 bg-gold-500 rounded-sm animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-gold-400 rounded-sm animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-gold-500 rounded-sm animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        {/* Text */}
        <h2 className="text-2xl font-bold text-gold-500 mb-2 font-['Outfit']">
          Déco Touché
        </h2>
        <p className="text-gray-400 text-lg">
          {message}{dots}
        </p>
        
        {/* Progress bar */}
        <div className="w-64 h-1 bg-gray-800 rounded-full mx-auto mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 rounded-full animate-loading-bar"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 50%; }
          50% { width: 30%; }
          100% { transform: translateX(200%); width: 50%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
