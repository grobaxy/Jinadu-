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
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  BookOpen,
  Compass,
  Zap,
  ChevronRight,
  Target,
  Crown,
  Shield,
  Key,
  X,
  User,
  Check,
} from 'lucide-react';

export function HintsView() {
  const {
    currentUser,
    firebaseUser,
    activeTab,
    setActiveTab,
    openWalletModal,
    openAuthModal,
    isUserSubscribed,
  } = useApp();

  const [hints, setHints] = useState<CompetitionHint[]>(() => getCachedCompetitionHints());
  const [selectedCompetition, setSelectedCompetition] = useState<'all' | CompetitionHintType>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHintToUnlock, setSelectedHintToUnlock] = useState<CompetitionHint | null>(null);

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
    (currentUser as any)?.tier ||
    (currentUser as any)?.activePlanId ||
    ''
  ).toLowerCase();

  const isVipTier =
    isSuperOrAdmin ||
    (!isExpired && (
      Boolean(currentUser?.isVip) ||
      rawTier.includes('vip') ||
      rawTier.includes('legend') ||
      rawTier.includes('master') ||
      rawTier.includes('annual')
    ));

  const isPremiumTier =
    isVipTier ||
    (!isExpired && (
      Boolean(currentUser?.isPremium) ||
      Boolean((currentUser as any)?.isSubscribed) ||
      Boolean(isUserSubscribed) ||
      rawTier.includes('premium') ||
      rawTier.includes('pro') ||
      rawTier.includes('scholar')
    ));

  // Determine definitive user tier: 'admin' | 'vip' | 'premium' | 'free'
  const identifiedTier: 'admin' | 'vip' | 'premium' | 'free' = useMemo(() => {
    if (isSuperOrAdmin) return 'admin';
    if (!currentUser && !firebaseUser) return 'free';
    if (isExpired) return 'free';
    if (isVipTier) return 'vip';
    if (isPremiumTier) return 'premium';
    return 'free';
  }, [isSuperOrAdmin, currentUser, firebaseUser, isExpired, isVipTier, isPremiumTier]);

  const isSubscriber = identifiedTier === 'admin' || identifiedTier === 'vip' || identifiedTier === 'premium';

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

  // Filter only published hints for students
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

  // Check access permissions for an individual hint based on user tier
  const canAccessHint = (hint: CompetitionHint): boolean => {
    if (identifiedTier === 'admin') return true;
    if (identifiedTier === 'vip') return true;
    if (identifiedTier === 'premium') {
      return hint.accessLevel !== 'vip';
    }
    // Free users cannot view protected topics/areas
    return false;
  };

  // Filtered hints by competition, search query, and access status
  const filteredHints = useMemo(() => {
    return publishedHints.filter((h) => {
      if (selectedCompetition !== 'all' && h.competitionType !== selectedCompetition) {
        return false;
      }
      const hasAccess = canAccessHint(h);
      if (accessFilter === 'unlocked' && !hasAccess) return false;
      if (accessFilter === 'locked' && hasAccess) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = h.title.toLowerCase().includes(q);
        const matchCategory = h.category.toLowerCase().includes(q);
        const matchTopic = h.topic.toLowerCase().includes(q);
        return matchTitle || matchCategory || matchTopic;
      }
      return true;
    });
  }, [publishedHints, selectedCompetition, accessFilter, searchQuery, identifiedTier]);

  // Unlocked vs locked counts
  const unlockedCount = useMemo(
    () => publishedHints.filter((h) => canAccessHint(h)).length,
    [publishedHints, identifiedTier]
  );
  const lockedCount = publishedHints.length - unlockedCount;

  // Direct user to subscribe
  const handleOpenUpgrade = () => {
    if (!currentUser && !firebaseUser) {
      if (openAuthModal) openAuthModal('LOGIN');
      return;
    }
    setSelectedHintToUnlock(null);
    if (openWalletModal) {
      openWalletModal('upgrade');
    }
  };

  const handleUnlockHintClick = (hint: CompetitionHint) => {
    if (!currentUser && !firebaseUser) {
      if (openAuthModal) openAuthModal('LOGIN');
      return;
    }
    setSelectedHintToUnlock(hint);
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

          {/* User Tier Identification & Quick Action */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {identifiedTier === 'free' && (
              <button
                onClick={handleOpenUpgrade}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Key className="w-4 h-4 text-slate-950 fill-current" />
                <span>Unlock All Hints (Subscribe)</span>
              </button>
            )}

            {identifiedTier === 'premium' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Premium Scholar Plan Active</span>
                </div>
                <button
                  onClick={handleOpenUpgrade}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Upgrade to VIP</span>
                </button>
              </div>
            )}

            {identifiedTier === 'vip' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold">
                <Crown className="w-4 h-4 text-amber-300" />
                <span>VIP Scholar Access Active (All Hints Unlocked)</span>
              </div>
            )}

            {identifiedTier === 'admin' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Administrator Access (Full Preview)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent User Tier Identification Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Tier Avatar Badge */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              identifiedTier === 'vip'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                : identifiedTier === 'premium'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : identifiedTier === 'admin'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {identifiedTier === 'vip' ? (
              <Crown className="w-6 h-6 text-amber-500" />
            ) : identifiedTier === 'premium' ? (
              <Shield className="w-6 h-6 text-blue-500" />
            ) : identifiedTier === 'admin' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <Lock className="w-6 h-6 text-amber-500" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Your Account Tier:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  identifiedTier === 'vip'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                    : identifiedTier === 'premium'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                    : identifiedTier === 'admin'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {identifiedTier === 'vip' && <Crown className="w-3 h-3 text-amber-500" />}
                {identifiedTier === 'premium' && <Shield className="w-3 h-3 text-blue-500" />}
                {identifiedTier === 'admin' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {identifiedTier === 'free' && <User className="w-3 h-3 text-amber-500" />}
                {identifiedTier === 'vip'
                  ? 'VIP Scholar'
                  : identifiedTier === 'premium'
                  ? 'Premium Scholar'
                  : identifiedTier === 'admin'
                  ? 'Administrator'
                  : 'Free Scholar'}
              </span>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({unlockedCount} of {publishedHints.length} Hints Unlocked)
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              {identifiedTier === 'vip' &&
                'You have VIP status! All competition hints, topics, study areas, and preparation strategies are fully unlocked.'}
              {identifiedTier === 'premium' &&
                'You have Premium status! Standard and Premium hints are unlocked. Exclusive VIP hints require a VIP subscription.'}
              {identifiedTier === 'admin' &&
                'Administrative privileges active. All hint contents are visible for verification.'}
              {identifiedTier === 'free' &&
                'Free scholars can view hint titles, subjects, and dates. Subscribe to unlock the exact topics, areas to prepare, and strategic advice.'}
            </p>
          </div>
        </div>

        {/* Tier Specific Action */}
        {identifiedTier === 'free' && (
          <button
            onClick={handleOpenUpgrade}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>Unlock Hints (Subscribe)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {identifiedTier === 'premium' && lockedCount > 0 && (
          <button
            onClick={handleOpenUpgrade}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Upgrade to VIP ({lockedCount} Locked)</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        {/* Sub-tabs by Competition */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
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

        {/* Access Status Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Access Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setAccessFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                accessFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAccessFilter('unlocked')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                accessFilter === 'unlocked'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Unlock className="w-3 h-3" />
              <span>Unlocked ({unlockedCount})</span>
            </button>
            <button
              onClick={() => setAccessFilter('locked')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                accessFilter === 'locked'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Locked ({lockedCount})</span>
            </button>
          </div>

          {/* Search Field */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or subject..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
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
              {searchQuery || accessFilter !== 'all'
                ? 'No matching hints found'
                : 'No competition hints published yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery || accessFilter !== 'all'
                ? 'Try adjusting your search query or switching access filter tabs.'
                : 'Hints will be published here ahead of upcoming Daily Ultimate Search and School Dome rounds. Check back soon!'}
            </p>
          </div>
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

                    {/* Access Badges & Unlock Action */}
                    <div className="flex items-center gap-2">
                      {/* Plan Requirement Badge */}
                      {hint.accessLevel === 'vip' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          VIP Only
                        </span>
                      ) : hint.accessLevel === 'premium' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-blue-500" />
                          Premium
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Premium & VIP
                        </span>
                      )}

                      {/* Explicit Unlock / Access Status Pill */}
                      {hasAccess ? (
                        <span
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-bold"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnlockHintClick(hint)}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          title="Click to Unlock this Hint"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-950 fill-current" />
                          <span>Unlock Hint</span>
                        </button>
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
                    /* Locked View for Non-Subscribers with Direct Unlock & Subscribe Prompts */
                    <div className="relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/5 via-slate-100/70 to-blue-500/5 dark:from-amber-950/20 dark:via-slate-950/60 dark:to-blue-950/20 p-4 sm:p-5 mt-3 space-y-3">
                      {/* Blurred placeholder hints to tease content */}
                      <div className="filter blur-xs select-none opacity-30 space-y-2.5 pointer-events-none">
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                      </div>

                      {/* Lock Message & Unlock Button */}
                      <div className="relative z-10 pt-1 text-center space-y-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-xs">
                          <Lock className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                            <span>Locked Content</span>
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              ({hint.accessLevel === 'vip' ? 'VIP Plan' : 'Premium or VIP Plan'})
                            </span>
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                            {hint.accessLevel === 'vip'
                              ? 'This competition hint requires an active VIP subscription to access.'
                              : 'Subscribe to unlock the exact topic, areas to prepare, and strategic advice for this round.'}
                          </p>
                        </div>

                        {/* Direct Unlock Button */}
                        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
                          <button
                            onClick={() => handleUnlockHintClick(hint)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5 fill-current" />
                            <span>Unlock Hint Content</span>
                          </button>

                          <button
                            onClick={handleOpenUpgrade}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                            <span>Subscribe Now</span>
                          </button>
                        </div>
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

      {/* Unlock Hint Modal / Subscriber Direction Flow */}
      {selectedHintToUnlock && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl p-6 space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setSelectedHintToUnlock(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-amber-500 fill-current" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Unlock Competition Hint
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Subscribe to unlock strategic insights for this round and prepare before questions drop.
              </p>
            </div>

            {/* Hint Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {selectedHintToUnlock.competitionType === 'daily_qa' ? 'Daily Ultimate Search' : 'School Dome'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {selectedHintToUnlock.category}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedHintToUnlock.title}
              </h4>
            </div>

            {/* What will be unlocked */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                What this unlock includes:
              </span>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Exact examination topic & curriculum focus</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Curated list of key areas to study</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Strategic preparation guidance for high competition speed</span>
                </div>
              </div>
            </div>

            {/* Current Identification Info */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">Your Current Status:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400 uppercase">
                {identifiedTier === 'free'
                  ? 'Free Scholar'
                  : identifiedTier === 'premium'
                  ? 'Premium Scholar'
                  : identifiedTier.toUpperCase()}
              </span>
            </div>

            {/* Action Buttons: Direct to Subscribe */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleOpenUpgrade}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-current" />
                <span>
                  {selectedHintToUnlock.accessLevel === 'vip' && identifiedTier === 'premium'
                    ? 'Upgrade to VIP to Unlock'
                    : 'Subscribe to Unlock Hint'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedHintToUnlock(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

