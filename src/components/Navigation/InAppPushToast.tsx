import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import {
  Bell,
  X,
  ArrowRight,
  Sparkles,
  Trophy,
  Swords,
  Building2,
  Wallet,
  ShieldAlert,
  BookOpen,
  ShoppingBag,
  Gift,
  Smartphone,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';

/**
 * Plays a pleasant, subtle notification chime using Web Audio API
 */
export const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.28);

    // Second harmonious tone
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.35);
      } catch {}
    }, 100);
  } catch {
    // AudioContext blocked by browser policy prior to user interaction
  }
};

/**
 * InAppPushToast
 * 
 * Renders real-time push notification toasts when new updates arrive for the active user.
 * Supports clicking to view details or dismissing.
 */
export const InAppPushToast: React.FC = () => {
  const { notifications, markNotificationRead, setActiveTab } = useApp();
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  const latestNotif = notifications && notifications.length > 0 ? notifications[0] : null;
  const latestNotifId = latestNotif?.id;
  const latestNotifIsRead = latestNotif?.isRead;

  useEffect(() => {
    if (!latestNotif) return;

    // First mount / initial load: register current latest as seen without alerting
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastSeenIdRef.current = latestNotif.id;
      return;
    }

    // When an actual new, unread notification arrives
    if (latestNotif.id !== lastSeenIdRef.current && !latestNotif.isRead) {
      lastSeenIdRef.current = latestNotif.id;
      setActiveToast(latestNotif);
      playNotificationSound();

      // Native browser notification if allowed
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(latestNotif.title || 'Grobaax Alert', {
            body: latestNotif.message,
            icon: '/icon.png',
          });
        }
      } catch {}

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [latestNotifId, latestNotifIsRead]);

  if (!activeToast) return null;

  const handleAction = () => {
    markNotificationRead(activeToast.id);
    if (activeToast.actionUrl) {
      const target = activeToast.actionUrl.toLowerCase();
      if (target.includes('chat') || target.includes('daily') || target.includes('gus')) setActiveTab('daily_qa');
      else if (target.includes('community') || target.includes('feed') || target.includes('minimart')) setActiveTab('community');
      else if (target.includes('library') || target.includes('past_question')) setActiveTab('library');
      else if (target.includes('wallet') || target.includes('user') || target.includes('profile')) setActiveTab('home');
      else setActiveTab('home');
    } else if (activeToast.type === 'dome' || activeToast.type === 'league') {
      setActiveTab('home');
    } else if (activeToast.type === 'academic_library' || activeToast.type === 'library') {
      setActiveTab('library');
    } else if (activeToast.type === 'gus') {
      setActiveTab('daily_qa');
    } else if (activeToast.type === 'minimart') {
      setActiveTab('community');
    } else {
      setActiveTab('home');
    }
    setActiveToast(null);
  };

  const getToastIcon = (t: string) => {
    switch (t) {
      case 'dome':
      case 'arena':
        return <Swords className="w-5 h-5 text-blue-400" />;
      case 'gus':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'league':
        return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-amber-400" />;
      case 'reward':
        return <Gift className="w-5 h-5 text-emerald-400" />;
      case 'academic_library':
      case 'library':
        return <BookOpen className="w-5 h-5 text-teal-400" />;
      case 'vtu':
        return <Smartphone className="w-5 h-5 text-indigo-400" />;
      case 'minimart':
        return <ShoppingBag className="w-5 h-5 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-400" />;
      case 'system':
        return <ShieldCheck className="w-5 h-5 text-blue-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <aside
      aria-label="New push alert"
      aria-live="polite"
      className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
    >
      <div
        id="grobax-push-toast-card"
        className="p-4 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-blue-500/40 shadow-2xl shadow-blue-950/60 backdrop-blur-md space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 shrink-0">
              {getToastIcon(activeToast.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  New Update
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-1">
                {activeToast.title}
              </h4>
            </div>
          </div>

          <button
            id="btn-dismiss-push-toast"
            onClick={() => setActiveToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {activeToast.message}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 font-medium">
            {activeToast.timestamp || 'Just now'}
          </span>
          <button
            id="btn-view-push-toast"
            onClick={handleAction}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
