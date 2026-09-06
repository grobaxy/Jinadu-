import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Shield,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  Award,
  Swords,
  Coins,
} from 'lucide-react';
import {
  startNewSchoolDomeSeason,
  endSchoolDomeSeasonAndDistributePrize,
} from '../../lib/schoolDomeService';
import { SchoolDomeSeason, SchoolDomeWinner } from '../../types';

interface SchoolDomeAdminSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: SchoolDomeSeason;
  adminUid?: string;
  adminName?: string;
  initialTab?: 'manage' | 'new_season';
  onSeasonUpdated?: () => void;
}

export const SchoolDomeAdminSeasonModal: React.FC<SchoolDomeAdminSeasonModalProps> = ({
  isOpen,
  onClose,
  season,
  adminUid,
  adminName,
  initialTab = 'manage',
  onSeasonUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'manage' | 'new_season'>(initialTab);

  // New Season Form State
  const [newTitle, setNewTitle] = useState(`School Dome — Season ${(season.seasonNumber || 1) + 1}`);
  const [newPrizePool, setNewPrizePool] = useState(50000);
  const [newCurrency, setNewCurrency] = useState<'NGN' | 'GP'>('GP');
  const [newDescription, setNewDescription] = useState('');
  const [newRules, setNewRules] = useState(
    '1. Answer correctly before time expires to survive.\n2. Wrong answers or expiring timers eliminate you immediately.\n3. Only scholars registered before Question #1 can participate.\n4. Surviving scholars split the entire prize pool equally at season end.'
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleEndSeasonAndSplitPrize = async () => {
    const standingCount = season.activeUserIds?.length || 0;
    const confirmText = `Are you sure you want to end ${season.title}?\n\nThe ${season.prizeCurrency === 'NGN' ? '₦' : ''}${season.prizePool.toLocaleString()} prize pool will be divided EQUALLY among the ${standingCount} last scholar(s) standing (${season.prizeCurrency === 'NGN' ? '₦' : ''}${Math.floor(season.prizePool / Math.max(1, standingCount)).toLocaleString()} each).`;

    if (!window.confirm(confirmText)) return;

    try {
      setIsProcessing(true);
      setFeedback(null);

      const result = await endSchoolDomeSeasonAndDistributePrize(season.id, adminUid, adminName);
      setFeedback({
        type: 'success',
        text: `Season successfully concluded! ${result.winners.length} winner(s) credited with ${season.prizeCurrency === 'NGN' ? '₦' : ''}${result.prizePerWinner.toLocaleString()} each!`,
      });

      if (onSeasonUpdated) onSeasonUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to finalize season.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a season title.' });
      return;
    }
    if (newPrizePool < 1000) {
      setFeedback({ type: 'error', text: 'Prize pool must be at least 1,000.' });
      return;
    }

    try {
      setIsProcessing(true);
      setFeedback(null);

      await startNewSchoolDomeSeason(
        {
          seasonNumber: (season.seasonNumber || 1) + 1,
          title: newTitle.trim(),
          prizePool: Number(newPrizePool),
          prizeCurrency: newCurrency,
          description: newDescription.trim(),
          rules: newRules
            .split('\n')
            .map(r => r.trim())
            .filter(Boolean),
        },
        adminUid,
        adminName
      );

      setFeedback({
        type: 'success',
        text: `New season "${newTitle}" created with registration open!`,
      });

      if (onSeasonUpdated) onSeasonUpdated();
      setActiveSubTab('manage');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to start new season.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const lastStandingCount = season.activeUserIds?.length || 0;
  const currentPrizePerWinner = Math.floor((season.prizePool || 0) / Math.max(1, lastStandingCount));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>School Dome Competition Controls</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage active season, prize pool distribution, and arena configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => { setActiveSubTab('manage'); setFeedback(null); }}
            className={`flex-1 py-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeSubTab === 'manage'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Active Season & Prize Split
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('new_season'); setFeedback(null); }}
            className={`flex-1 py-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeSubTab === 'new_season'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Start New Season
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Manage Current Season Tab */}
        {activeSubTab === 'manage' && (
          <div className="p-5 space-y-5">
            {/* Status Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {season.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Season #{season.seasonNumber} • Questions Launched: {season.totalQuestionsLaunched || 0}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  season.status === 'ended'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300'
                    : season.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
                }`}>
                  {season.status === 'ended' ? 'Concluded' : season.status === 'active' ? 'Active In Progress' : 'Registration Open'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">TOTAL PRIZE POOL</span>
                  <strong className="text-xs sm:text-sm font-black text-amber-500">
                    {season.prizeCurrency === 'NGN' ? '₦' : ''}{season.prizePool.toLocaleString()} {season.prizeCurrency === 'GP' ? 'GP' : ''}
                  </strong>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">REGISTERED</span>
                  <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {season.registeredUserIds?.length || 0} scholars
                  </strong>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">STILL STANDING</span>
                  <strong className="text-xs sm:text-sm font-black text-emerald-500">
                    {lastStandingCount} scholars
                  </strong>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">PRIZE / WINNER</span>
                  <strong className="text-xs sm:text-sm font-black text-blue-500">
                    {season.prizeCurrency === 'NGN' ? '₦' : ''}{currentPrizePerWinner.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Registration status badge */}
              <div className="flex items-center gap-2 text-xs pt-1">
                {season.isRegistrationLocked ? (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Registration is locked (Question #1 launched)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Registration is open to all scholars</span>
                  </div>
                )}
              </div>
            </div>

            {/* Equal Prize Split Action Card */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Equal Prize Pool Division Rule</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                When you conclude this season, the full prize pool (<strong>{season.prizeCurrency === 'NGN' ? '₦' : ''}{season.prizePool.toLocaleString()}</strong>) will be divided <strong>equally</strong> among all <strong>{lastStandingCount}</strong> scholar(s) who survived every question. Their in-app balances will be updated immediately.
              </p>

              {season.status !== 'ended' ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleEndSeasonAndSplitPrize}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition hover:scale-101 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Conclude Season & Distribute Prize Equally ({season.prizeCurrency === 'NGN' ? '₦' : ''}{currentPrizePerWinner.toLocaleString()} each)</span>
                </button>
              ) : (
                <div className="p-2.5 bg-white/70 dark:bg-slate-900/80 rounded-xl text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  ✓ This season has ended and prizes have already been distributed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start New Season Form */}
        {activeSubTab === 'new_season' && (
          <form onSubmit={handleStartNewSeason} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Season Title *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. School Dome — Season 2: Clash of Champions"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Prize Pool Amount *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={newPrizePool}
                  onChange={e => setNewPrizePool(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Currency *
                </label>
                <select
                  value={newCurrency}
                  onChange={e => setNewCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                >
                  <option value="NGN">NGN (₦ Nigerian Naira Cash)</option>
                  <option value="GP">GP (Grobaax Points)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Season Description / Theme
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Optional description of this season's theme, participating institutions, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Season Rules (One rule per line) *
              </label>
              <textarea
                rows={4}
                required
                value={newRules}
                onChange={e => setNewRules(e.target.value)}
                placeholder="Enter rules, one per line"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono text-[11px]"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-700 dark:text-blue-300">
              <span className="font-bold">Note:</span> Starting a new season sets registration to <strong>OPEN</strong>. Once you launch the first question for this new season, registration will automatically lock permanently.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('manage')}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start & Open Registration</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
