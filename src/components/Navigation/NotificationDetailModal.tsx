import React from 'react';
import { createPortal } from 'react-dom';
import { NotificationItem } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Bell,
  Swords,
  Trophy,
  Building2,
  Wallet,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ShoppingBag,
  Gift,
  Smartphone,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  Crown,
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  onMarkAsRead,
}) => {
  const { setActiveTab, openWalletModal, navigateToAdminTab, currentUser } = useApp();

  if (!notification) return null;

  const handleActionNavigate = () => {
    if (onMarkAsRead) onMarkAsRead(notification.id);
    onClose();

    const isAdminUser =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'SUPER_ADMIN';

    if (
      notification.targetRole === 'admin' ||
      notification.actionUrl?.includes('admin:library') ||
      (isAdminUser && notification.type === 'academic_library')
    ) {
      navigateToAdminTab('library');
      return;
    }

    if (notification.actionUrl) {
      const target = notification.actionUrl.toLowerCase();
      if (target.includes('upgrade') || target.includes('membership') || target.includes('tier')) {
        openWalletModal('upgrade');
        return;
      }
      if (target.startsWith('wallet:')) {
        const sub = target.split(':')[1] || 'profile';
        openWalletModal(sub as any);
        return;
      }
      if (target.includes('profile')) {
        openWalletModal('profile');
        return;
      }
      if (target.includes('wallet')) {
        openWalletModal('history');
        return;
      }
      if (target.includes('gus')) {
        setActiveTab('gus');
        return;
      }
      if (target.includes('chat') || target.includes('daily')) {
        setActiveTab('daily_qa');
        return;
      }
      if (target.includes('library')) {
        setActiveTab('library');
        return;
      }
      if (target.includes('community')) {
        setActiveTab('community');
        return;
      }
    }

    if (notification.type === 'reward') {
      openWalletModal('history');
    } else if (notification.type === 'gus') {
      setActiveTab('gus');
    } else if (notification.type === 'academic_library' || notification.type === 'library') {
      setActiveTab('library');
    } else {
      setActiveTab('home');
    }
  };

  const getActionLabel = () => {
    const target = (notification.actionUrl || '').toLowerCase();
    if (target.includes('upgrade') || target.includes('tier') || target.includes('membership')) {
      return { label: 'Explore Membership Tiers', icon: <Crown className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('profile') || target === 'wallet:profile') {
      return { label: 'View Trophy Cabinet & Pass', icon: <Trophy className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('wallet') || notification.type === 'reward') {
      return { label: 'View Wallet & Ledger', icon: <Wallet className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('gus') || notification.type === 'gus') {
      return { label: 'Enter GUS Olympiad', icon: <Trophy className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('library') || notification.type === 'academic_library') {
      return { label: 'Go to Academic Vault', icon: <BookOpen className="w-4 h-4 text-teal-300" /> };
    }
    return { label: 'View Activity', icon: <ArrowRight className="w-4 h-4" /> };
  };

  const actionMeta = getActionLabel();

  const getNotifBadge = (type: string) => {
    switch (type) {
      case 'dome':
      case 'arena':
        return {
          icon: <Swords className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          label: 'Speed Quiz & Arena',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'gus':
        return {
          icon: <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          label: 'Daily Ultimate Search',
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'league':
        return {
          icon: <Building2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          label: 'Campus League',
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'wallet':
        return {
          icon: <Wallet className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          label: 'GP Wallet & Rewards',
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'reward':
        return {
          icon: <Gift className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          label: 'Scholar Milestone Reward',
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'academic_library':
      case 'library':
        return {
          icon: <BookOpen className="w-5 h-5 text-teal-500 dark:text-teal-400" />,
          label: 'Academic Past Questions Library',
          style: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        };
      case 'vtu':
        return {
          icon: <Smartphone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
          label: 'Telecom Airtime & Data',
          style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      case 'minimart':
        return {
          icon: <ShoppingBag className="w-5 h-5 text-purple-500 dark:text-purple-400" />,
          label: 'Campus Minimart',
          style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'announcement':
        return {
          icon: <Megaphone className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          label: 'Campus Announcement',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          label: 'System Notification',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
    }
  };

  const badgeInfo = getNotifBadge(notification.type);

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Body */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl text-slate-900 dark:text-white my-auto z-10 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
            {badgeInfo.icon}
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeInfo.style}`}
            >
              {badgeInfo.label}
            </span>
            <h3 className="font-extrabold text-base sm:text-lg leading-snug mt-1 text-slate-900 dark:text-white">
              {notification.title}
            </h3>
          </div>
        </div>

        {/* Timestamp & Status info */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-y border-slate-100 dark:border-slate-800/80 py-2.5 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-purple-500" /> Received: {notification.timestamp}
          </span>
          <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Official Broadcast
          </span>
        </div>

        {/* Notification Body / Message Text */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 space-y-2.5 shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
            Message Body from Administrator
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (onMarkAsRead) onMarkAsRead(notification.id);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleActionNavigate}
            className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            {actionMeta.icon}
            <span>{actionMeta.label}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
