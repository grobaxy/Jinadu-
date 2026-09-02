import React from 'react';
import { createPortal } from 'react-dom';
import { NotificationItem } from '../../types';
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
  if (!notification) return null;

  const getNotifBadge = (type: string) => {
    switch (type) {
      case 'dome':
      case 'arena':
        return {
          icon: <Swords className="w-5 h-5 text-purple-400" />,
          label: 'Arena Match',
          style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'gus':
        return {
          icon: <Trophy className="w-5 h-5 text-amber-400" />,
          label: 'GUS Tournament',
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'league':
        return {
          icon: <Building2 className="w-5 h-5 text-emerald-400" />,
          label: 'Institutional League',
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'wallet':
        return {
          icon: <Wallet className="w-5 h-5 text-blue-400" />,
          label: 'Wallet & GP',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'announcement':
        return {
          icon: <Sparkles className="w-5 h-5 text-purple-400" />,
          label: 'Admin Broadcast',
          style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-purple-400" />,
          label: 'System Notification',
          style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
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
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              if (onMarkAsRead) onMarkAsRead(notification.id);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Close Notification</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
