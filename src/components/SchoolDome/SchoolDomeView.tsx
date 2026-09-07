import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp, checkIsUserSubscribed } from '../../context/AppContext';
import {
  SchoolDomeMessage,
  SchoolDomeSeason,
  SchoolDomeQuestion,
  PRIMARY_SUPER_ADMIN_UID,
} from '../../types';
import { SchoolDomeMessageItem } from './SchoolDomeMessageItem';
import { SchoolDomeRulesModal } from './SchoolDomeRulesModal';
import { ChatroomComposer } from '../Community/ChatroomLive/ChatroomComposer';
import { CreateSchoolDomeQuestionModal } from './CreateSchoolDomeQuestionModal';
import { SchoolDomeResultsTab } from './SchoolDomeResultsTab';
import {
  subscribeSchoolDomeActiveSeason,
  subscribeSchoolDomeActiveQuestion,
  subscribeSchoolDomeMessages,
  sendSchoolDomeMessage,
  reactSchoolDomeMessage,
  deleteSchoolDomeMessage,
  registerUserForSchoolDome,
  checkScholarSchoolDomePlanEligibility,
  closeSchoolDomeQuestion,
  extendSchoolDomeQuestionTime,
} from '../../lib/schoolDomeService';
import {
  getTodayLocalDateString,
  getSynchronousDailyChatUsage,
  getUserDailyChatUsage,
  recordUserDailyChatResponse,
} from '../../lib/firebase';
import {
  MessageSquare,
  Search,
  Volume2,
  VolumeX,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Radio,
  Sparkles,
  Shield,
  ArrowUpRight,
  Crown,
  Trophy,
  Swords,
  CheckCircle2,
  Eye,
  AlertCircle,
  UserCheck,
  ScrollText,
} from 'lucide-react';

// Web Audio API synthesizer for message chimes
function playAudioTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Suppressed audio error
  }
}

interface SchoolDomeViewProps {
  initialTab?: 'arena' | 'results';
}

export const SchoolDomeView: React.FC<SchoolDomeViewProps> = ({ initialTab = 'arena' }) => {
  const {
    currentUser,
    firebaseUser,
    role,
    isUserSubscribed,
    setWalletModalTab,
    setIsWalletModalOpen,
    openWalletModal,
  } = useApp();

  const [currentSeason, setCurrentSeason] = useState<SchoolDomeSeason | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<SchoolDomeQuestion | null>(null);
  const [messages, setMessages] = useState<SchoolDomeMessage[]>([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'arena' | 'results'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Subscriptions to Season, Active Question, and Messages
  useEffect(() => {
    const unsubSeason = subscribeSchoolDomeActiveSeason((season) => {
      setCurrentSeason(season);
    });
    return () => unsubSeason();
  }, []);

  useEffect(() => {
    if (!currentSeason?.id) return;
    const unsubQ = subscribeSchoolDomeActiveQuestion(currentSeason.id, (q) => {
      setActiveQuestion(q);
    });
    const unsubMsg = subscribeSchoolDomeMessages(currentSeason.id, (msgs) => {
      setMessages(msgs);
    });
    return () => {
      unsubQ();
      unsubMsg();
    };
  }, [currentSeason?.id]);

  // Grobaax central subscription source of truth
  const membership = (currentUser?.membershipTier || '').toLowerCase();
  const subTier = (currentUser?.subscriptionTier || '').toLowerCase();
  const plan = (
    ((currentUser as any)?.subscriptionPlan ||
      (currentUser as any)?.planId ||
      (currentUser as any)?.tier ||
      (currentUser as any)?.activePlanId) + ''
  ).toLowerCase();

  const isStaffOrAdmin =
    role === 'admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'community_manager' ||
    Boolean((currentUser as any)?.managerRole) ||
    firebaseUser?.uid === PRIMARY_SUPER_ADMIN_UID ||
    firebaseUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.name?.toLowerCase().includes('admin') ||
    currentUser?.name?.toLowerCase().includes('staff');

  // Auto-close active question when countdown timer expires for admins/staff in background
  useEffect(() => {
    if (!activeQuestion || activeQuestion.status !== 'active' || !isStaffOrAdmin) return;
    const diff = activeQuestion.endAt - Date.now();
    if (diff <= 0) {
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id);
      return;
    }
    const timer = setTimeout(() => {
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id);
    }, Math.max(100, diff));
    return () => clearTimeout(timer);
  }, [activeQuestion?.id, activeQuestion?.status, activeQuestion?.endAt, isStaffOrAdmin, currentSeason?.id]);

  const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);

  const isVIP =
    !isStaffOrAdmin &&
    Boolean(
      currentUser?.isVip ||
      currentUser?.gusTier === 'Titan' ||
      membership.includes('vip') ||
      membership.includes('titan') ||
      subTier.includes('vip') ||
      subTier.includes('titan') ||
      plan.includes('vip') ||
      plan.includes('titan') ||
      plan.includes('annual')
    );

  const isPremium =
    !isStaffOrAdmin &&
    !isVIP &&
    Boolean(
      isActivelySubscribed ||
      currentUser?.isPremium ||
      (membership && !membership.includes('free') && membership.trim().length > 0) ||
      (subTier && !subTier.includes('free') && subTier.trim().length > 0) ||
      (plan && !plan.includes('free') && plan.trim().length > 0)
    );

  const tierName: 'free' | 'premium' | 'vip' | 'admin' = isStaffOrAdmin
    ? 'admin'
    : isVIP
    ? 'vip'
    : isPremium
    ? 'premium'
    : 'free';

  // Daily Limits: Free (2), Premium (15), VIP (20), Admin/Manager (Unlimited)
  const maxDailyLimit = isStaffOrAdmin ? Infinity : isVIP ? 20 : isPremium ? 15 : 2;

  // Consistent daily date basis (YYYY-MM-DD in local time)
  const todayDate = useMemo(() => getTodayLocalDateString(), []);
  const activeUserId = currentUser?.id || currentUser?.uid || firebaseUser?.uid || 'guest';

  // Daily response count (Only increments on successful submission)
  const [dailyResponseCount, setDailyResponseCount] = useState<number>(() => {
    try {
      const syncVal = getSynchronousDailyChatUsage(activeUserId, todayDate);
      if (currentUser?.dailyQaUsage && currentUser.dailyQaUsage.date === todayDate) {
        return Math.max(syncVal, currentUser.dailyQaUsage.count || 0);
      }
      return syncVal;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (activeUserId && activeUserId !== 'guest') {
      const syncVal = getSynchronousDailyChatUsage(activeUserId, todayDate);
      let latestCount = syncVal;
      if (currentUser?.dailyQaUsage) {
        if (currentUser.dailyQaUsage.date === todayDate) {
          latestCount = Math.max(syncVal, currentUser.dailyQaUsage.count || 0);
        } else {
          latestCount = 0;
        }
      }
      setDailyResponseCount(latestCount);

      let isMounted = true;
      getUserDailyChatUsage(activeUserId, todayDate)
        .then((usage) => {
          if (isMounted) {
            if (usage.date === todayDate) {
              setDailyResponseCount((prev) => Math.max(prev, usage.count));
            } else {
              setDailyResponseCount(0);
            }
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [activeUserId, todayDate, currentUser?.dailyQaUsage?.date, currentUser?.dailyQaUsage?.count]);

  const isLimitReached = !isStaffOrAdmin && dailyResponseCount >= maxDailyLimit;

  const [isRegistering, setIsRegistering] = useState(false);

  // Participation & Spectator Status
  const isRegistrationOpen = Boolean(
    currentSeason &&
    !currentSeason.isRegistrationLocked &&
    !currentSeason.firstQuestionLaunched &&
    currentSeason.status !== 'ended'
  );
  const isUserRegistered = Boolean(currentSeason?.registeredUserIds?.includes(currentUser.id));
  const isUserEliminated = Boolean(currentSeason?.eliminatedUserIds?.includes(currentUser.id));
  const isUserStanding = Boolean(currentSeason?.activeUserIds?.includes(currentUser.id));
  const isSpectator = !isStaffOrAdmin && (!isUserRegistered || isUserEliminated || !isUserStanding);

  const handleRegister = async () => {
    if (!currentSeason?.id || isRegistering) return;
    try {
      setIsRegistering(true);
      const res = await registerUserForSchoolDome(currentSeason.id, currentUser);
      if (!res.success) {
        alert(res.message);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenUpgrade = () => {
    if (openWalletModal) {
      openWalletModal('upgrade');
    } else if (setWalletModalTab && setIsWalletModalOpen) {
      setWalletModalTab('upgrade');
      setIsWalletModalOpen(true);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<SchoolDomeMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.messageText?.toLowerCase().includes(q) ||
      m.userName?.toLowerCase().includes(q) ||
      m.institution?.toLowerCase().includes(q)
    );
  });

  const hasUserRepliedToQuestionMessage = (msg: SchoolDomeMessage): boolean => {
    if (msg.type !== 'question') return false;
    const qId = msg.competitionRef?.questionId || msg.id.replace(/^dome_msg_q_/, '').replace(/^sdq_/, '');
    const normName = (currentUser?.name || '').toLowerCase().trim();

    if (msg.competitionRef?.repliedUserIds?.includes(currentUser.id)) return true;
    if (normName && (msg.competitionRef as any)?.repliedUsernames?.includes(normName)) return true;
    if (msg.competitionRef?.selectedWinners?.some((w) => w.userId === currentUser.id)) return true;

    const hasUserRepliedInChat = messages.some(
      (m) =>
        m.userId === currentUser.id &&
        (m.replyTo?.id === msg.id || (qId && m.replyTo?.id === qId) || (qId && m.replyTo?.id === `dome_msg_q_${qId}`))
    );
    if (hasUserRepliedInChat) return true;

    return false;
  };

  const hasRepliedToTarget = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') return false;
    return hasUserRepliedToQuestionMessage(replyTarget);
  }, [replyTarget, messages, currentUser.id, currentUser?.name]);

  // Subscription plan eligibility for the active question
  const questionPlanEligibility = useMemo(() => {
    return checkScholarSchoolDomePlanEligibility(currentUser, activeQuestion);
  }, [currentUser, activeQuestion]);

  // Subscription plan eligibility for the current reply target
  const replyTargetPlanEligibility = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') {
      return { isEligible: true, userPlanName: '', requiredPlanText: '' };
    }
    const targetQId =
      replyTarget.competitionRef?.questionId ||
      replyTarget.id.replace(/^dome_msg_q_/, '').replace(/^msg_sdq_/, '');
    const qObj = activeQuestion?.id === targetQId ? activeQuestion : activeQuestion;
    return checkScholarSchoolDomePlanEligibility(currentUser, qObj);
  }, [replyTarget, activeQuestion, currentUser]);

  const handleSendMessage = async (text: string, replyTo?: SchoolDomeMessage['replyTo']) => {
    // Whenever admin clicks End Season, typing is strictly unavailable for regular users; admin remains open
    if (currentSeason?.status === 'ended' && !isStaffOrAdmin) {
      return;
    }

    // Non-registered or eliminated users can spectate but cannot type/participate
    if (!isStaffOrAdmin && isSpectator) {
      return;
    }

    // Prevent replying twice to a question challenge
    if (replyTo?.id) {
      const isTargetingQuestion =
        replyTo.id.startsWith('dome_msg_q_') ||
        replyTo.id.startsWith('msg_sdq_') ||
        messages.some((m) => m.id === replyTo.id && m.type === 'question');

      if (isTargetingQuestion) {
        if (!replyTargetPlanEligibility.isEligible && !isStaffOrAdmin) {
          alert(
            `Your subscription plan (${replyTargetPlanEligibility.userPlanName}) is not eligible to answer this question. Required: ${replyTargetPlanEligibility.requiredPlanText}. Your tournament standing is safe.`
          );
          return;
        }

        const targetQMsg = messages.find(
          (m) =>
            m.id === replyTo.id ||
            (m.competitionRef?.questionId &&
              (`dome_msg_q_${m.competitionRef.questionId}` === replyTo.id ||
                `msg_sdq_${m.competitionRef.questionId}` === replyTo.id))
        );
        if (targetQMsg && hasUserRepliedToQuestionMessage(targetQMsg)) {
          return;
        }
      }
    }

    const newMessage: SchoolDomeMessage = {
      id: 'sdm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      seasonId: currentSeason?.id || 'season_dome_1',
      userId: currentUser.id,
      userName: isStaffOrAdmin && !currentUser.name.includes('Support')
        ? `${currentUser.name} 💎 | Moderator`
        : currentUser.name,
      userAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: currentUser.institution || 'Grobaax Scholar',
      department: currentUser.department,
      level: currentUser.level,
      isPremium: isVIP || isPremium || isStaffOrAdmin,
      isVip: isVIP,
      membershipTier: isVIP ? 'VIP SCHOLAR' : isPremium ? 'PREMIUM SCHOLAR' : isStaffOrAdmin ? 'VIP SCHOLAR' : undefined,
      equippedBadge: currentUser.equippedBadge,
      messageText: text,
      timestamp: Date.now(),
      type: 'normal',
      replyTo,
      reactions: {},
    };

    try {
      await sendSchoolDomeMessage(newMessage, currentSeason, activeQuestion);
    } catch (err) {
      console.warn('School Dome message sync notice:', err);
    }

    if (soundEnabled) {
      playAudioTone();
    }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    try {
      await reactSchoolDomeMessage(msgId, emoji);
    } catch (err) {
      console.warn('React message notice:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteSchoolDomeMessage(msgId);
    } catch (err) {
      console.warn('Delete message notice:', err);
    }
  };

  const handleMuteUser = (_userId: string, userName: string) => {
    console.info(`User ${userName} muted locally.`);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100dvh-80px)] min-h-[500px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* 1. DISCORD-STYLE CHANNEL HEADER */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        {/* Left: Channel indicator & Live Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-extrabold text-sm sm:text-base">
            <span className="text-blue-500 dark:text-blue-400 font-black text-base sm:text-lg">#</span>
            <span className="text-sm">💬</span>
            <span className="truncate tracking-tight">school-dome</span>
          </div>

          {/* Arena vs Results View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('arena')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'arena'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className={`w-3 h-3 ${activeTab === 'arena' ? 'animate-pulse text-emerald-500' : ''}`} />
              <span>Arena</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className={`w-3 h-3 ${activeTab === 'results' ? 'text-amber-500' : ''}`} />
              <span>Champions</span>
            </button>
          </div>

          {/* Season Statistics Badge */}
          {currentSeason && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <span>Season #{currentSeason.seasonNumber || 1}</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">
                {currentSeason.prizePool?.toLocaleString()} {currentSeason.prizeCurrency || 'GP'} Pool
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {currentSeason.activeUserIds?.length || 0} Standing
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Rules Button (Visible on the top of the school dome card) */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="View School Dome Arena Rules set by Admin"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Rules</span>
          </button>

          {/* Admin Launch Live Question Button */}
          {isStaffOrAdmin && (
            <button
              onClick={() => setIsCreateQuestionModalOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-300 shrink-0"
              title="Launch Live Q&A Question Challenge"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[10px]">
                Q
              </span>
              <span className="hidden sm:inline">Ask Question</span>
            </button>
          )}

          {/* Search Toggle */}
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                autoFocus
                className="w-36 sm:w-52 pl-3 pr-7 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Search chat"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Registration & Survival Status Banner */}
      {currentSeason && (
        <div className="px-3 sm:px-4 py-2 bg-transparent text-slate-800 dark:text-slate-100 border-b border-slate-200/70 dark:border-slate-800/80 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs min-w-0">
            {isRegistrationOpen ? (
              isUserRegistered ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>You are Registered for Season #{currentSeason.seasonNumber}! Question #1 locks registration.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <Swords className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Season #{currentSeason.seasonNumber} Registration is OPEN! Register before Question #1 launches.</span>
                </div>
              )
            ) : isUserEliminated ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>You were eliminated from Season #{currentSeason.seasonNumber}. Spectator Mode active (watching live).</span>
              </div>
            ) : isUserStanding ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Active Contender • {currentSeason.activeUserIds?.length || 0} scholars standing for {currentSeason.prizePool.toLocaleString()} {currentSeason.prizeCurrency || 'GP'}!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Registration closed upon Question #1 launch. Spectator Mode active (watching live).</span>
              </div>
            )}
          </div>

          {/* Register Button if open and user not yet registered */}
          {isRegistrationOpen && !isUserRegistered && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isRegistering}
                onClick={handleRegister}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isRegistering ? 'Registering...' : 'Register to Compete'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: EITHER CHAMPIONS RESULTS BOARD OR LIVE ARENA */}
      {activeTab === 'results' ? (
        <SchoolDomeResultsTab currentSeason={currentSeason} />
      ) : (
        <>
          {/* 2. MAIN MESSAGE STREAM */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40"
          >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 sm:p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">
                School Dome Connected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Be the first to post a question or response! Questions, answers, and discussions appear instantly for all users across the platform.
              </p>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <SchoolDomeMessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUser.id}
              isManagerOrAdmin={isStaffOrAdmin}
              hasRepliedToQuestion={hasUserRepliedToQuestionMessage(msg)}
              isSpectator={isSpectator}
              onReply={(m) => setReplyTarget(m)}
              onDelete={handleDeleteMessage}
              onMuteUser={handleMuteUser}
              onReact={handleReactMessage}
              onCloseQuestion={isStaffOrAdmin ? (qId) => closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', qId) : undefined}
              onExtendTime={isStaffOrAdmin ? (qId, extra) => extendSchoolDomeQuestionTime(qId, extra) : undefined}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-all cursor-pointer z-20 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>
      )}

          {/* 3. DISCORD BOTTOM COMPOSER OR SPECTATOR BAR OR SEASON ENDED (TYPING UNAVAILABLE STRICTLY FOR REGULAR USERS) */}
          {currentSeason?.status === 'ended' && !isStaffOrAdmin ? (
            <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      Season #{currentSeason?.seasonNumber || 1} Has Concluded
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Typing Unavailable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    The competition has ended. All prizes have been distributed equally to the surviving champions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  View Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Champions Board</span>
                </button>
              </div>
            </div>
          ) : isSpectator ? (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isUserEliminated
                    ? `You have been eliminated from Season #${currentSeason?.seasonNumber || 1}. You can watch all questions and answers in real-time, but cannot participate.`
                    : `Registration for Season #${currentSeason?.seasonNumber || 1} closed when Question #1 launched. Spectators can watch all questions and answers in real-time.`}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] border border-amber-500/30 shrink-0 uppercase tracking-wider">
                Spectator Mode
              </span>
            </div>
          ) : (
            <div className="flex flex-col shrink-0">
              {currentSeason?.status === 'ended' && isStaffOrAdmin && (
                <div className="px-3.5 py-2 bg-amber-500/10 dark:bg-amber-950/40 border-t border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
                    <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-bold truncate">
                      Season #{currentSeason.seasonNumber || 1} Concluded • Admin Channel Open
                    </span>
                    <span className="hidden md:inline text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      (Typing is locked for regular participants, but open for administrators)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('results')}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      View Champions
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      Admin Mode
                    </span>
                  </div>
                </div>
              )}
              <ChatroomComposer
                onSendMessage={handleSendMessage}
                replyToMessage={replyTarget as any}
                onCancelReply={() => setReplyTarget(null)}
                isChatMuted={false}
                channelName="school-dome"
                dailyLimit={9999}
                usedCount={0}
                isLimitReached={false}
                tierName={tierName}
                isManagerOrAdmin={isStaffOrAdmin}
                hasRepliedToTarget={hasRepliedToTarget}
                isQuestionPlanIneligible={Boolean(
                  !isStaffOrAdmin &&
                    replyTarget?.type === 'question' &&
                    !replyTargetPlanEligibility.isEligible
                )}
                questionPlanIneligibleReason={replyTargetPlanEligibility.reason}
                onOpenUpgrade={handleOpenUpgrade}
                onOpenCreateQuestion={() => setIsCreateQuestionModalOpen(true)}
              />
            </div>
          )}
        </>
      )}

      {/* Admin Live Question Launcher Modal */}
      {isCreateQuestionModalOpen && (
        <CreateSchoolDomeQuestionModal
          isOpen={isCreateQuestionModalOpen}
          onClose={() => setIsCreateQuestionModalOpen(false)}
          season={currentSeason}
          adminUid={currentUser.id}
          adminName={currentUser.name}
          defaultWinnerCount={1}
          defaultGpReward={500}
        />
      )}

      {/* Rules Popup Card */}
      <SchoolDomeRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        season={currentSeason}
      />
    </div>
  );
};
