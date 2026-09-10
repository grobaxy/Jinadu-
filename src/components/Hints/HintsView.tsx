import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CompetitionHint,
  CompetitionHintType,
  PRIMARY_SUPER_ADMIN_UID,
} from '../../types';
import {
  subscribeToCompetitionHints,
  getCachedCompetitionHints,
} from '../../lib/hintsService';
import {
  Lightbulb,
  Trophy,
  Swords,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  Calendar,
  Compass,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Target,
  Clock,
  Layers,
} from 'lucide-react';

export function HintsView() {
  const {
    currentUser,
    firebaseUser,
    activeTab,
    setActiveTab,
    openWalletModal,
    setViewMode,
    setAdminActiveTab,
  } = useApp();

  const [hints, setHints] = useState<CompetitionHint[]>(() => getCachedCompetitionHints());
  const [selectedCompetition, setSelectedCompetition] = useState<'all' | CompetitionHintType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Determine user permissions and subscription state
  const isSuperOrAdmin =
    firebaseUser?.uid === PRIMARY_SUPER_ADMIN_UID ||
    firebaseUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.email === 'grobaxycompany@gmail.com' ||
    firebaseUser?.email === 'basmock@gmail.com' ||
    currentUser?.email === 'basmock@gmail.com' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    Boolean((currentUser as any)?.managerRole);

  // Check user subscription status
  const isExpired = currentUser?.subscriptionExpiry
    ? new Date(currentUser.subscriptionExpiry).getTime() <= Date.now()
    : false;

  const rawTier = (
    currentUser?.subscriptionTier ||
    currentUser?.membershipTier ||
    (currentUser as any)?.subscriptionPlan ||
    ''
  ).toLowerCase();

  const isVipTier =
    isSuperOrAdmin ||
    (!isExpired && (rawTier.includes('vip') || rawTier.includes('legend') || rawTier.includes('master')));

  const isPremiumTier =
    isVipTier ||
    (!isExpired &&
      (currentUser?.isPremium ||
        rawTier.includes('premium') ||
        rawTier.includes('pro') ||
        rawTier.includes('scholar')));

  const isSubscriber = isSuperOrAdmin || (!isExpired && (isPremiumTier || isVipTier));

  // Subscribe to real-time hints
  useEffect(() => {
    const unsub = subscribeToCompetitionHints(
      (updatedHints) => {
        setHints(updatedHints);
        setLoading(false);
      },
      (err) => {
        console.warn('Hints listener error:', err);
        setLoading(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter only published hints for students (admins can see drafts in admin panel)
  const publishedHints = useMemo(() => {
    return hints.filter((hint) => hint.status === 'published');
  }, [hints]);

  // Counts for competition tabs
  const dailyQACount = useMemo(
    () => publishedHints.filter((h) => h.competitionType === 'daily_qa').length,
    [publishedHints]
  );
  const schoolDomeCount = useMemo(
    () => publishedHints.filter((h) => h.competitionType === 'school_dome').length,
    [publishedHints]
  );

  // Filtered by selected competition and search query
  const filteredHints = useMemo(() => {
    return publishedHints.filter((h) => {
      if (selectedCompetition !== 'all' && h.competitionType !== selectedCompetition) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = h.title.toLowerCase().includes(q);
        const matchCategory = h.category.toLowerCase().includes(q);
        const matchTopic = h.topic.toLowerCase().includes(q);
        return matchTitle || matchCategory || matchTopic;
      }
      return true;
    });
  }, [publishedHints, selectedCompetition, searchQuery]);

  // Check access permissions for an individual hint
  const canAccessHint = (hint: CompetitionHint): boolean => {
    if (isSuperOrAdmin) return true;
    if (!isSubscriber) return false;

    if (hint.accessLevel === 'vip') {
      return isVipTier;
    }
    if (hint.accessLevel === 'premium') {
      return isPremiumTier || isVipTier;
    }
    // 'both' access level
    return isPremiumTier || isVipTier;
  };

  const handleOpenUpgrade = () => {
    if (openWalletModal) {
      openWalletModal('upgrade');
    }
  };

  const handleGoToAdminManagement = () => {
    if (setAdminActiveTab) setAdminActiveTab('hints');
    if (setViewMode) setViewMode('admin');
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 md:p-10 border border-blue-800/40 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Official GROBAAX Competition Hints
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Prepare Ahead for Upcoming Competitions
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Gain strategic preparation insights for <span className="font-bold text-amber-400">Daily Ultimate Search</span> and <span className="font-bold text-blue-400">School Dome</span>. Review likely topics, key subjects, and critical areas before the competition questions drop.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isSubscriber && (
              <button
                onClick={handleOpenUpgrade}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-current" />
                <span>Unlock All Hints (Subscribe)</span>
              </button>
            )}

            {isSubscriber && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {isVipTier ? 'VIP Scholar Access Active' : 'Premium Subscriber Access Active'}
                </span>
              </div>
            )}

            {isSuperOrAdmin && (
              <button
                onClick={handleGoToAdminManagement}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>Manage Hints (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Callout Banner for Free Users */}
      {!isSubscriber && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/15 border-2 border-amber-500/30 dark:border-amber-400/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Subscriber Exclusive Access
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Subscribe to unlock exclusive competition hints and prepare before the questions drop.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenUpgrade}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Upgrade to Subscribe</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSelectedCompetition('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              selectedCompetition === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>All Hints</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {publishedHints.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCompetition('daily_qa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              selectedCompetition === 'daily_qa'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Daily Ultimate Search</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
              {dailyQACount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCompetition('school_dome')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              selectedCompetition === 'school_dome'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-blue-500" />
            <span>School Dome</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
              {schoolDomeCount}
            </span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px] sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic or subject..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Hints Cards List */}
      {filteredHints.length === 0 ? (
        <div className="p-10 sm:p-14 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Lightbulb className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {searchQuery ? 'No matching hints found' : 'No competition hints published yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching with different subject or topic keywords.'
                : 'Hints will be published here ahead of upcoming Daily Ultimate Search and School Dome rounds. Check back soon!'}
            </p>
          </div>
          {isSuperOrAdmin && !searchQuery && (
            <button
              onClick={handleGoToAdminManagement}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>Create First Hint</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHints.map((hint) => {
            const hasAccess = canAccessHint(hint);
            const isDailyQA = hint.competitionType === 'daily_qa';

            return (
              <div
                key={hint.id}
                className={`relative rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isDailyQA
                    ? 'bg-gradient-to-br from-white via-amber-50/20 to-white dark:from-slate-900 dark:via-amber-950/10 dark:to-slate-900 border-amber-200/60 dark:border-amber-900/30'
                    : 'bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-900 dark:via-blue-950/10 dark:to-slate-900 border-blue-200/60 dark:border-blue-900/30'
                } shadow-sm hover:shadow-md`}
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Competition Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isDailyQA
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isDailyQA ? (
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Swords className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span>{isDailyQA ? 'Daily Ultimate Search' : 'School Dome'}</span>
                    </div>

                    {/* Tier Access Badge */}
                    <div className="flex items-center gap-2">
                      {hint.accessLevel === 'vip' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          VIP Only
                        </span>
                      ) : hint.accessLevel === 'premium' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          Premium Only
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Premium & VIP
                        </span>
                      )}

                      {/* Lock/Unlock Status Icon */}
                      {hasAccess ? (
                        <span
                          title="Unlocked"
                          className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span
                          title="Locked"
                          className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                      {hint.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                        Category: {hint.category}
                      </span>
                      {hint.updatedAt && (
                        <span className="text-[11px] text-slate-400">
                          Posted {new Date(hint.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Protected Content Area */}
                  {hasAccess ? (
                    <div className="space-y-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                      {/* Specific Topic */}
                      <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-blue-500" />
                          Specific Topic
                        </span>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {hint.topic}
                        </p>
                      </div>

                      {/* Areas to Prepare */}
                      {hint.areasToPrepare && hint.areasToPrepare.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                            Areas to Prepare
                          </span>
                          <ul className="space-y-1.5">
                            {hint.areasToPrepare.map((area, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>{area}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Preparation Message */}
                      {hint.preparationMessage && (
                        <div className="p-3.5 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 space-y-1">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Preparation Advice
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                            {hint.preparationMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Locked View for Non-Subscribers */
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 p-4 sm:p-5 mt-3 space-y-3">
                      {/* Blurred placeholder hints to tease content */}
                      <div className="filter blur-xs select-none opacity-40 space-y-2.5 pointer-events-none">
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                      </div>

                      {/* Lock Message & CTA Overlay */}
                      <div className="relative z-10 pt-1 text-center space-y-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                          <Lock className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            {hint.accessLevel === 'vip' && isSubscriber
                              ? 'VIP Exclusive Hint'
                              : 'Protected Hint Content'}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {hint.accessLevel === 'vip' && isSubscriber
                              ? 'This hint is configured for VIP subscribers. Upgrade to VIP to reveal.'
                              : 'Subscribe to unlock exclusive competition hints and prepare before the questions drop.'}
                          </p>
                        </div>

                        <button
                          onClick={handleOpenUpgrade}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                          <span>
                            {hint.accessLevel === 'vip' && isSubscriber
                              ? 'Upgrade to VIP'
                              : 'Subscribe to Unlock'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Quick Jump to Competition */}
                <div className="p-4 sm:p-5 pt-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isDailyQA ? 'Daily Ultimate Search' : 'School Dome Arena'}
                  </span>

                  <button
                    onClick={() => setActiveTab(isDailyQA ? 'daily_qa' : 'school_dome')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
                  >
                    <span>{isDailyQA ? 'Go to Daily Search' : 'Enter Arena'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
