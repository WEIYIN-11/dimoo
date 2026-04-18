import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const FLOATS = [
  { emoji: '👗', top: '8%',  left: '6%',  size: 'text-3xl', delay: '0s'    },
  { emoji: '👒', top: '15%', right: '8%', size: 'text-2xl', delay: '0.4s'  },
  { emoji: '🧦', top: '70%', left: '4%',  size: 'text-xl',  delay: '0.8s'  },
  { emoji: '👟', top: '75%', right: '6%', size: 'text-2xl', delay: '0.2s'  },
  { emoji: '🧢', top: '40%', left: '3%',  size: 'text-xl',  delay: '1s'    },
  { emoji: '🎀', top: '45%', right: '4%', size: 'text-2xl', delay: '0.6s'  },
];

export default function Login() {
  const { signInWithGoogle, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithGoogle();
      // If popup succeeds, auth state updates automatically.
      // If redirect, page navigates away — keep loading.
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 via-brand-500 to-purple-500 overflow-hidden p-6">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-brand-300/10 blur-2xl" />
      </div>

      {/* Floating emojis */}
      {FLOATS.map(({ emoji, top, left, right, size, delay }) => (
        <span
          key={emoji + delay}
          className={`absolute ${size} select-none pointer-events-none opacity-40`}
          style={{
            top, left, right,
            animation: `float 4s ease-in-out infinite`,
            animationDelay: delay,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center">

        {/* App icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-5">
          <span className="text-4xl">👗</span>
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tight">童裝店管家</h1>
        <p className="text-sm text-gray-400 mb-8 text-center">登入以管理您的庫存、採購與銷售</p>

        {/* Google sign-in */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl py-3.5 px-5 text-sm font-semibold text-gray-700 transition-all active:scale-[0.97] shadow-sm"
        >
          <GoogleIcon />
          {loading ? '登入中…' : '使用 Google 帳戶登入'}
        </button>

        {authError && (
          <p className="mt-3 text-xs text-red-500 text-center">{authError}</p>
        )}

        <p className="text-[11px] text-gray-300 text-center mt-6 leading-relaxed">
          您的資料僅儲存於本機裝置<br />不同帳戶的資料各自獨立
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
