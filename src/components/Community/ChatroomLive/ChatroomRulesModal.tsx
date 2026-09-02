import React from 'react';
import { X, Trophy, Zap, Crown, CheckCircle2, Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface ChatroomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal?: () => void;
  isPremium?: boolean;
}

export const ChatroomRulesModal: React.FC<ChatroomRulesModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgradeModal,
  isPremium,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-950/20 via-blue-900/10 to-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Chatroom Live — Competition & Reward Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily academic clashes, typed-answer speed rounds, and instant GP payouts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Schedule Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Official Schedule & Timing
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Live competitions are hosted every <span className="font-bold text-slate-900 dark:text-white">Monday through Friday at 7:00 PM (WAT)</span> directly inside this room. Questions are released dynamically by the Grobax Arbiter.
              </p>
            </div>
          </div>

          {/* Rule Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Typed Answers Only</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                No multiple-choice guess buttons. Type the exact word, name, or number in the chatbox below as soon as the question is released. Case-insensitive and alias-tolerant.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>First 5 Eligible Winners</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The automated Grobax Arbiter engine evaluates incoming answers chronologically down to the millisecond. The first 5 eligible answers secure the round victory.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Admin Set GP Rewards</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Each verified winner receives an instant GP payout credited directly to their balance as set by the Admin (e.g. +50 GP, +100 GP, or +200 GP).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>1 Reply Per Question Rule</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Scholars cannot reply twice or spam multiple attempts per question. Each scholar is permitted exactly 1 answer attempt per live question challenge.
              </p>
            </div>
          </div>

          {/* User Status Card */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isPremium ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Your Current Status: {isPremium ? '👑 Grobax Premium Active' : 'Free Scholar'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isPremium ? 'Eligible for all cash GP prizes & winner slots' : 'Upgrade to qualify for instant 200 GP rewards upon answering'}
                </div>
              </div>
            </div>

            {!isPremium && onOpenUpgradeModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal();
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
          >
            Got It, Let's Chat!
          </button>
        </div>
      </div>
    </div>
  );
};
