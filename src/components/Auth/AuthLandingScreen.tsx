import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuthModal } from './AuthModal';
import { signInWithGoogle, ensureUserInFirestore, formatAuthError } from '../../lib/firebase';
import {
  Sparkles,
  UserPlus,
  LogIn,
  GraduationCap,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const AuthLandingScreen: React.FC = () => {
  const { openAuthModal, setIsAuthModalOpen, isAuthModalOpen, authModalMode, login } = useApp();
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleDirectGoogleSignIn = async () => {
    if (isGoogleSigningIn) return;
    setIsGoogleSigningIn(true);
    setGoogleError('');

    try {
      const user = await signInWithGoogle();
      const profile = await ensureUserInFirestore(user);

      login(profile);
    } catch (err: any) {
      const isCancelledOrClosed =
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('Pending promise was never set') ||
        err?.message?.includes('popup-closed-by-user');

      if (isCancelledOrClosed) {
        console.warn('Google sign-in popup was cancelled or closed.');
      } else {
        console.error('Google Direct Sign In Error:', err);
        setGoogleError(formatAuthError(err.code || err.message || ''));
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-500/10 dark:bg-blue-600/20 blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-950/40 border border-blue-700/50">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              GROBAAX
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase tracking-widest hidden sm:inline">
                VERIFIED ACADEMIC
              </span>
            </h1>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => openAuthModal('LOGIN')}
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Login</span>
          </button>

          <button
            onClick={() => openAuthModal('REGISTER')}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-black text-xs rounded-xl shadow-md shadow-blue-950/30 border border-blue-700/50 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16 text-center relative z-10 flex-1 flex flex-col items-center justify-center space-y-6">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs font-black tracking-wide shadow-xs">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-300 animate-pulse" />
          <span>Student Academic & Competition Platform</span>
        </div>

        {/* Branding Title */}
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Grow Big & Excel
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Competitive challenge where students participate in live competitions, to test their knowledge and skills.
          </p>
        </div>

        {/* Error message if Google Sign In fails */}
        {googleError && (
          <div className="p-3.5 max-w-md w-full rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{googleError}</span>
          </div>
        )}

        {/* Google Quick Sign-In & Main CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-3.5 pt-2 w-full max-w-md">
          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={handleDirectGoogleSignIn}
            disabled={isGoogleSigningIn}
            className="w-full py-3.5 px-6 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            {isGoogleSigningIn ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative w-full text-center my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <span className="relative px-3 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase font-bold text-slate-400">
              Or with email
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => openAuthModal('REGISTER')}
              className="py-3 px-4 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-black text-xs rounded-xl shadow-md shadow-blue-950/30 border border-blue-700/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => openAuthModal('LOGIN')}
              className="py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-6 border-t border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 relative z-10">
        <div>©2023 Grobaaxylimited • Inter-Institutional Arena</div>
        <div className="flex items-center gap-4">
          <button onClick={() => openAuthModal('LOGIN')} className="hover:text-blue-300 transition-colors cursor-pointer">
            Login
          </button>
          <span>•</span>
          <button onClick={() => openAuthModal('REGISTER')} className="hover:text-blue-300 transition-colors cursor-pointer">
            Create Account
          </button>
        </div>
      </footer>

      {/* Auth Modal overlay */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(profile) => {
          login(profile);
        }}
      />
    </div>
  );
};

