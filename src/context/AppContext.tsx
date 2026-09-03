import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, setDoc, addDoc, serverTimestamp, onSnapshot, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import {
  grobaxDataService,
  institutionRepo,
  minimartRepo,
  gusRepo,
  financeRepo,
} from '../lib/dataAccess';
import {
  auth,
  db,
  getUserProfileDoc,
  ensureUserInFirestore,
  updateUserProfileInFirestore,
  deductUserGpInFirestore,
  adjustUserGpInFirestore,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_GP_CONVERSION,
  sendBroadcastNotificationToFirestore,
  saveSystemSettingsToFirestore,
  fetchSystemSettingsFromFirestore,
  saveGpConversionConfigToFirestore,
  submitWithdrawalRequestInFirestore,
  deleteCommunityPostFromFirestore,
  recordWalletTransactionInFirestore,
  saveCommunityPostToFirestore,
  updateCommunityPostInFirestore,
  deletePlatformEventFromFirestore,
  toggleLikeCommunityPostInFirestore,
  addCommentToCommunityPostInFirestore,
  sendChatroomMessageToFirestore,
  deleteChatroomMessageFromFirestore,
  reactChatroomMessageInFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  saveSponsorshipCampaignToFirestore,
  deleteSponsorshipCampaignFromFirestore,
  assignRepresentativeInFirestore,
  removeRepresentativeInFirestore,
} from '../lib/firebase';
import { isPrimarySuperAdmin } from '../lib/adminPermissions';
import {
  UserRole,
  ThemeMode,
  TabType,
  UserProfile,
  Post,
  EventItem,
  Announcement,
  BadgeStoreItem,
  MasterInstitution,
  LeagueFixture,
  WithdrawalRecord,
  PrivacySettings,
  SystemSettings,
  LeagueSeason,
  QuestionSet,
  QualificationCompetition,
  RepresentativeRecord,
  RepresentativeAssignment,
  InstitutionCategory,
  InstitutionRank,
  QuestionItem,
  GusSeason,
  GusRound,
  GusPrizeConfig,
  GusWinner,
  GusParticipantRecord,
  GusLiveClockState,
  DomeSession,
  DomeQuestionItem,
  DomeUserProgress,
  DomeScoreboardEntry,
  DomeHistoryItem,
  DomeLiveClockState,
  Transaction,
  OFFICIAL_EVENT_HOST,
  SubscriptionPlan,
  UserSubscriptionRecord,
  ChatroomLiveMessage,
} from '../types';
import { verifyPaystackTransaction } from '../lib/paystackService';
import {
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_EVENTS,
  MOCK_ANNOUNCEMENTS,
  MOCK_BADGES_STORE,
  MOCK_MASTER_INSTITUTIONS,
  MOCK_FIXTURES,
  MOCK_WITHDRAWALS,
  MOCK_SEASONS,
  MOCK_QUESTION_SETS,
  MOCK_QUALIFICATION_COMPETITIONS,
  MOCK_REPRESENTATIVE_RECORDS,
  MOCK_GUS_SEASONS,
  MOCK_GUS_PARTICIPANTS,
  MOCK_GUS_PRIZES,
  MOCK_DOME_SESSIONS,
  MOCK_DOME_SCOREBOARD,
  MOCK_DOME_USER_PROGRESS,
  MOCK_DOME_HISTORY,
  MOCK_SPONSORSHIP_CAMPAIGNS,
  MOCK_TRANSACTIONS,
  MOCK_GP_CONVERSION,
  MOCK_UPGRADE_PLANS,
  MOCK_NOTIFICATIONS,
} from '../data/mockData';
import { MOCK_CHATROOM_MESSAGES } from '../data/mockChatroomData';
import {
  DEFAULT_MINIMART_CONFIG,
  INITIAL_MINIMART_CATEGORIES,
  INITIAL_MINIMART_PRODUCTS,
} from '../data/mockMinimartData';
import { INITIAL_FEED_POSTS } from '../data/initialFeedPosts';
import {
  GpConversionConfig,
  SponsorshipCampaign,
  UpgradePlan,
  NotificationItem,
  PostReport,
  PostComment,
  MinimartProduct,
  MinimartCategory,
  MinimartReport,
  MinimartConfig,
  MinimartProductStatus,
  MinimartReportReason,
  UserListingEligibility,
  UserSectionUnreadCounts,
  AdminSectionUnreadCounts,
} from '../types';
import { grobaxNotificationService } from '../lib/notificationService';
import {
  saveMinimartProductToFirestore,
  updateMinimartProductStatusInFirestore,
  deleteMinimartProductFromFirestore,
  submitMinimartReportToFirestore,
  moderateMinimartReportInFirestore,
  saveMinimartCategoryToFirestore,
  deleteMinimartCategoryFromFirestore,
  saveMinimartConfigToFirestore,
  seedInitialMinimartDataToFirestore,
} from '../lib/firebase';

interface AppContextType {
  isAuthReady: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRepresentativeStatus: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'dark' | 'light';
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: UserProfile;
  userProfile: UserProfile;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleTheme: () => void;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;
  walletModalTab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade';
  setWalletModalTab: (tab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade') => void;
  openWalletModal: (initialTab?: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade') => void;
  subscriptionPlans: SubscriptionPlan[];
  activeSubscriptionPlans: SubscriptionPlan[];
  subscribeToPlan: (
    plan: SubscriptionPlan,
    paymentMethod?: 'GP' | 'CARD' | 'TRANSFER',
    paymentReference?: string
  ) => Promise<{ success: boolean; message: string }>;
  isUserSubscribed: boolean;
  isUpgradePromoVisible: boolean;
  dismissUpgradePromo: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD') => void;
  login: (profile: UserProfile) => void;
  logout: () => Promise<void>;
  firebaseUser: FirebaseUser | null;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  events: EventItem[];
  toggleEventRegistration: (id: string) => void;
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  createPost: (content: string, tags: string[], attachmentData?: string) => Promise<void>;
  updatePost: (postId: string, content: string, tags: string[], image?: string) => Promise<void>;
  deletePlatformEvent: (eventId: string) => Promise<void>;
  toggleLikePost: (id: string) => void;
  claimReward: (amount: number, unit: 'GRBX' | 'GP', reason: string) => void;
  badgeStore: BadgeStoreItem[];
  buyBadge: (badge: BadgeStoreItem) => boolean;
  withdrawals: WithdrawalRecord[];
  requestGpWithdrawal: (gpAmount: number, bankName: string, accountNumber: string) => boolean;
  updatePrivacy: (newPrivacy: Partial<PrivacySettings>) => void;
  isBalanceHidden: boolean;
  toggleBalanceHidden: () => void;
  
  // Master Institutions & Departments
  masterInstitutions: MasterInstitution[];
  addMasterInstitution: (inst: Omit<MasterInstitution, 'id' | 'activeInSeason' | 'hidden'>) => void;
  updateMasterInstitution: (id: string, data: Partial<MasterInstitution>) => void;
  addDepartmentToInstitution: (instId: string, departmentName: string) => void;
  removeDepartmentFromInstitution: (instId: string, departmentName: string) => void;
  toggleInstitutionSeason: (id: string) => void;
  toggleInstitutionHidden: (id: string) => void;

  // Seasons
  seasons: LeagueSeason[];
  addSeason: (season: Omit<LeagueSeason, 'id'>) => void;
  updateSeasonStatus: (seasonId: string, status: LeagueSeason['status']) => void;
  toggleSeasonParticipation: (seasonId: string, instId: string) => void;

  // Question Bank
  questionSets: QuestionSet[];
  addQuestionSet: (qSet: Omit<QuestionSet, 'id'>) => void;
  addQuestionToSet: (qSetId: string, question: Omit<QuestionItem, 'id'>) => void;

  // Qualifications & Representatives
  qualificationCompetitions: QualificationCompetition[];
  addQualificationCompetition: (qual: Omit<QualificationCompetition, 'id'>) => void;
  representativeRecords: RepresentativeRecord[];
  representativeAssignments: RepresentativeAssignment[];
  assignRepresentative: (student: {
    studentId: string;
    studentName: string;
    studentUsername?: string;
    avatar?: string;
    institutionId: string;
    institutionName?: string;
    department?: string;
    level?: string;
    seasonId?: string;
    score?: number;
  }) => Promise<void> | void;
  removeRepresentative: (repIdOrInstId: string) => Promise<void> | void;

  // Fixtures & Match Control
  fixtures: LeagueFixture[];
  updateFixtureScore: (id: string, homeScore: number, awayScore: number, status: 'Live' | 'Upcoming' | 'Completed') => void;
  addFixture: (fix: Omit<LeagueFixture, 'id'>) => void;
  updateFixtureState: (id: string, patch: Partial<LeagueFixture>) => void;

  // Calculated Standings
  calculateStandings: (category: InstitutionCategory, seasonId?: string) => InstitutionRank[];

  // GUS (Global Ultimate Search) System
  gusSeasons: GusSeason[];
  activeGusSeason: GusSeason | null;
  gusParticipants: GusParticipantRecord[];
  userGusRecord: GusParticipantRecord | null;
  gusLiveClock: GusLiveClockState | null;
  registerForGusSeason: (seasonId: string) => boolean;
  submitGusAnswer: (seasonId: string, roundNumber: number, questionIndex: number, selectedOptionIndex: number) => { isCorrect: boolean; isEliminated: boolean };
  addGusSeason: (season: Omit<GusSeason, 'id' | 'registeredParticipantIds' | 'activeParticipantIds' | 'eliminatedParticipantIds' | 'winners'>) => void;
  updateGusSeason: (seasonId: string, patch: Partial<GusSeason>) => void;
  addGusRoundToSeason: (seasonId: string, round: Omit<GusRound, 'id'>) => void;
  updateGusRoundInSeason: (seasonId: string, roundId: string, patch: Partial<GusRound>) => void;
  addQuestionToGusRound: (seasonId: string, roundId: string, question: Omit<QuestionItem, 'id'>) => void;
  updateGusPrizes: (seasonId: string, prizes: GusPrizeConfig[]) => void;
  adminControlGusCompetition: (seasonId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_ROUND' | 'START_NEXT_ROUND' | 'END_COMPETITION') => void;

  // DOME (Live Non-Eliminatory Quiz) System
  domeSessions: DomeSession[];
  activeDomeSession: DomeSession | null;
  domeScoreboard: DomeScoreboardEntry[];
  domeUserProgress: DomeUserProgress;
  domeHistory: DomeHistoryItem[];
  domeLiveClock: DomeLiveClockState | null;
  submitDomeAnswer: (sessionId: string, questionIndex: number, selectedOptionIndex: number | null) => { isCorrect: boolean; gpEarned: number };
  addDomeSession: (session: Omit<DomeSession, 'id' | 'participantsCount' | 'totalGpDistributed' | 'currentQuestionIndex'>) => void;
  updateDomeSession: (sessionId: string, patch: Partial<DomeSession>) => void;
  addQuestionToDomeSession: (sessionId: string, question: Omit<DomeQuestionItem, 'id'>) => void;
  adminControlDomeSession: (sessionId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_SESSION') => void;

  // Community, Feed & Announcements
  chatroomMessages: ChatroomLiveMessage[];
  sendChatroomMessage: (message: ChatroomLiveMessage) => Promise<void>;
  deleteChatroomMessage: (messageId: string) => Promise<void>;
  reactChatroomMessage: (messageId: string, emoji: string) => Promise<void>;
  minimartProducts: MinimartProduct[];
  minimartCategories: MinimartCategory[];
  minimartConfig: MinimartConfig;
  minimartReports: MinimartReport[];
  addMinimartProduct: (productData: Omit<MinimartProduct, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'reportsCount' | 'viewsCount'>) => Promise<{ success: boolean; error?: string; product?: MinimartProduct }>;
  updateMinimartProduct: (productId: string, updates: Partial<MinimartProduct>) => Promise<{ success: boolean; error?: string; product?: MinimartProduct }>;
  deleteMinimartProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  reportMinimartProduct: (productId: string, reason: MinimartReportReason, description: string) => Promise<{ success: boolean; error?: string }>;
  updateMinimartProductStatus: (productId: string, status: MinimartProductStatus) => Promise<{ success: boolean; error?: string }>;
  saveMinimartCategory: (category: MinimartCategory) => Promise<{ success: boolean; error?: string }>;
  deleteMinimartCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>;
  saveMinimartConfig: (config: Partial<MinimartConfig>) => Promise<{ success: boolean; error?: string }>;
  moderateMinimartReport: (reportId: string, action: 'dismiss' | 'resolve' | 'suspend_product', adminNotes?: string) => Promise<{ success: boolean; error?: string }>;
  checkUserListingEligibility: (userId?: string) => UserListingEligibility;
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  publishAnnouncement: (id: string) => void;
  scheduleAnnouncement: (id: string, scheduleDate: string) => void;
  unpublishAnnouncement: (id: string) => void;
  pinAnnouncement: (id: string) => void;
  hidePost: (postId: string) => void;
  deletePost: (postId: string) => void;
  restorePost: (postId: string) => void;
  reportPost: (postId: string, reason: string) => void;
  addCommentToPost: (
    postId: string,
    content: string,
    parentId?: string | null,
    replyTo?: { name: string; username: string; commentId: string } | null
  ) => void;
  toggleLikeComment: (postId: string, commentId: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  suspendUserPosting: (userId: string) => void;

  // Wallet, Transactions & Conversion Admin
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'date' | 'status' | 'transactionId'>) => void;
  gpConversionConfig: GpConversionConfig;
  updateGpConversionConfig: (config: Partial<GpConversionConfig>) => void;
  updateWithdrawalStatus: (id: string, status: WithdrawalRecord['status'], notes?: string) => void;
  adminAdjustGpBalance: (amount: number, reason: string) => void;
  adminAdjustTargetUserGp: (targetUserId: string, amount: number, reason: string) => Promise<void>;

  // GP Store Badges
  addBadgeToStore: (badge: Omit<BadgeStoreItem, 'id'>) => void;
  updateBadgeInStore: (id: string, patch: Partial<BadgeStoreItem>) => void;
  equipBadge: (badgeId: string) => void;

  // Sponsorship & Advertisements
  sponsorshipCampaigns: SponsorshipCampaign[];
  addSponsorshipCampaign: (campaign: Omit<SponsorshipCampaign, 'id'>) => void;
  updateSponsorshipCampaign: (id: string, patch: Partial<SponsorshipCampaign>) => void;
  deleteSponsorshipCampaign: (id: string) => void;

  // Upgrade Plans
  upgradePlans: UpgradePlan[];
  updateUpgradePlan: (id: string, patch: Partial<UpgradePlan>) => void;

  // Notifications & Global Badges
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  sendNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  addNotification?: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  sectionNotifications: UserSectionUnreadCounts;
  adminSectionNotifications: AdminSectionUnreadCounts;
  clearSectionNotification: (sectionKey: string) => void;
  markSectionAsRead: (sectionKey: string) => void;
  emitSectionNotification: (event: { section: string; title: string; message?: string; targetRole?: 'USER' | 'ADMIN' | 'ALL' }) => Promise<void>;

  // System Configuration & Health
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<void>;

  // User Profile
  updateUserProfile: (data: Partial<UserProfile>) => void;

  triggerAiBroadcast: (message: string) => void;
  selectedRoleUser: UserProfile;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_basic_naira',
    planId: 'plan_basic_naira',
    name: 'Scholar Starter Plan',
    shortDescription: 'Essential premium academic privileges & competition access',
    fullDescription: 'Essential premium plan for scholars wanting daily ultimate search, withdrawal eligibility, AI library handouts, and minimart listings.',
    priceNaira: 1000,
    currency: 'NGN',
    durationValue: 30,
    durationUnit: 'Days',
    benefits: [
      'Daily Ultimate Search — 15 Responses',
      'Withdrawal Eligibility — Available',
      'AI Library — 5 Handout Generations',
      'Campus Minimart Products Listing (3 / Day)',
      'No Grobax Pop-up Upgrade Ads',
      'Profile Verification Badge — Available',
      'Premium Badge — Available',
    ],
    features: ['30 Days Validity', '15 Daily Searches', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'No Pop-up Ads', 'Premium Badge'],
    badgeLabel: 'POPULAR',
    featured: false,
    active: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_pro_naira',
    planId: 'plan_pro_naira',
    name: 'Champions Pro Scholar',
    shortDescription: 'Enhanced privileges, 2x GP boost & exclusive arena access',
    fullDescription: 'Designed for high-performing scholars competing in the Institutional Champions League and Global Ultimate Search.',
    priceNaira: 2500,
    currency: 'NGN',
    durationValue: 30,
    durationUnit: 'Days',
    benefits: [
      'Daily Ultimate Search — 15 Responses',
      'Withdrawal Eligibility — Available',
      'AI Library — 5 Handout Generations',
      'Campus Minimart Products Listing (3 / Day)',
      'No Grobax Pop-up Upgrade Ads',
      '2x GP Reward Multiplier on all Competitions',
      'Profile Badge & Premium Badge — Available',
      'Priority Live Match Queue & Arena Access',
    ],
    features: ['30 Days Validity', '15 Daily Searches', '2x GP Multiplier', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'Premium Badge'],
    badgeLabel: 'RECOMMENDED',
    featured: true,
    active: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_titan_naira',
    planId: 'plan_titan_naira',
    name: 'Grobax Titan Annual VIP',
    shortDescription: 'Ultimate academic VIP access for 1 Full Year',
    fullDescription: 'Comprehensive annual subscription for institution representatives and top scholars with full VIP status, 20 searches, unlimited handouts, 6 listings/day, and maximum rewards.',
    priceNaira: 25000,
    currency: 'NGN',
    durationValue: 365,
    durationUnit: 'Days',
    benefits: [
      'Daily Ultimate Search — 20 Responses',
      'Withdrawal Eligibility — Available (Zero Processing Fees)',
      'AI Library — Unlimited Handouts Generation',
      'Campus Minimart Products Listing (6 / Day)',
      'No Grobax Pop-up Upgrade Ads',
      'Profile Badge & VIP Gold Crown Badge — Available',
      '3x GP Reward Multiplier across all League & GUS Rounds',
      'Instant Representative Fast-Track Review',
    ],
    features: ['365 Days Validity', '20 Daily Searches', 'Unlimited AI Handouts', '6 Minimart Listings/Day', '3x GP Multiplier', 'Gold VIP Crown'],
    badgeLabel: 'VIP ANNUAL',
    featured: false,
    active: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper function to check if a user is currently an active paid subscriber
export const checkIsUserSubscribed = (user: UserProfile | null | undefined): boolean => {
  if (!user) return false;

  const isStaffOrAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    (user.role as string) === 'staff' ||
    user.role === 'community_manager' ||
    Boolean(user.name && user.name.toLowerCase().includes('admin'));

  if (isStaffOrAdmin) return true;

  // Check if subscription has expired
  if (user.subscriptionExpiry) {
    const expiryTime = new Date(user.subscriptionExpiry).getTime();
    if (!isNaN(expiryTime) && expiryTime <= Date.now()) {
      return false; // Expired - all benefits paused
    }
  }

  // Active plan ID present and valid
  if (
    user.activePlanId &&
    user.activePlanId.trim().length > 0 &&
    !user.activePlanId.toLowerCase().includes('free')
  ) {
    return true;
  }

  // Active subscription object
  if (user.subscription && user.subscription.status === 'active') {
    return true;
  }

  if (user.isPremium) return true;
  if ((user as any).isSubscribed) return true;

  if (user.membershipTier) {
    const tier = user.membershipTier.toLowerCase().trim();
    if (
      tier &&
      !tier.includes('free') &&
      tier !== 'starter scholar' &&
      !tier.includes('scholar (starter)')
    ) {
      return true;
    }
  }

  if (user.subscriptionTier) {
    const tier = user.subscriptionTier.toLowerCase().trim();
    if (tier && !tier.includes('free') && tier !== 'starter scholar' && !tier.includes('scholar (starter)')) {
      return true;
    }
  }

  const planStr = (
    ((user as any).subscriptionPlan ||
      (user as any).planId ||
      (user as any).tier ||
      (user as any).plan ||
      '') + ''
  ).toLowerCase().trim();

  if (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.length > 0) {
    return true;
  }

  return false;
};

// Canonical resolver for user subscription benefits, badges, and tier
export const resolveUserSubscriptionStatus = (user: Partial<UserProfile> | null | undefined): {
  isSubscribed: boolean;
  isExpired: boolean;
  effectiveTier: string;
  tierType: 'free' | 'premium' | 'vip';
  isPremium: boolean;
} => {
  if (!user) {
    return { isSubscribed: false, isExpired: false, effectiveTier: 'Free Scholar', tierType: 'free', isPremium: false };
  }

  const isStaffOrAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    (user.role as string) === 'staff' ||
    (user.name && (user.name.toLowerCase().includes('admin') || user.name.toLowerCase().includes('staff')));

  const isCommunityManager =
    user.role === 'community_manager' ||
    (user.name && user.name.toLowerCase().includes('community manager'));

  if (isStaffOrAdmin || isCommunityManager) {
    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: 'VIP SCHOLAR',
      tierType: 'vip',
      isPremium: true,
    };
  }

  const isExpired = user.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).getTime() <= Date.now()
    : false;

  if (isExpired) {
    // When expired, all benefits, badges, and VIP/premium privileges are automatically removed
    return {
      isSubscribed: false,
      isExpired: true,
      effectiveTier: 'Free Scholar',
      tierType: 'free',
      isPremium: false,
    };
  }

  const membership = (user.membershipTier || '').toLowerCase();
  const subTier = (user.subscriptionTier || '').toLowerCase();
  const planStr = (((user as any).subscriptionPlan || (user as any).planId || (user as any).tier || user.activePlanId || '') + '').toLowerCase();

  const isVip =
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    planStr.includes('vip') ||
    planStr.includes('titan') ||
    planStr.includes('annual');

  if (isVip) {
    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: user.membershipTier || user.subscriptionTier || 'VIP SCHOLAR',
      tierType: 'vip',
      isPremium: true,
    };
  }

  const isPrem = Boolean(
    user.isPremium ||
    (user as any).isSubscribed ||
    (user.activePlanId && !user.activePlanId.toLowerCase().includes('free')) ||
    (user.subscription && user.subscription.status === 'active') ||
    (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
    (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
    (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.trim().length > 0)
  );

  if (isPrem) {
    const resolvedTier =
      (user.membershipTier && !user.membershipTier.toLowerCase().includes('free') && user.membershipTier) ||
      (user.subscriptionTier && !user.subscriptionTier.toLowerCase().includes('free') && user.subscriptionTier) ||
      ((user as any).subscriptionPlan && !(user as any).subscriptionPlan.toLowerCase().includes('free') && (user as any).subscriptionPlan) ||
      (user.activePlanId && (DEFAULT_SUBSCRIPTION_PLANS.find(p => p.planId === user.activePlanId)?.name)) ||
      'PREMIUM SCHOLAR';

    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: resolvedTier,
      tierType: 'premium',
      isPremium: true,
    };
  }

  return {
    isSubscribed: false,
    isExpired: false,
    effectiveTier: 'Free Scholar',
    tierType: 'free',
    isPremium: false,
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('student');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('grobax_theme') as ThemeMode) || 'dark';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS.student);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletModalTab, setWalletModalTab] = useState<
    'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade'
  >('profile');
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);

  // Balance privacy visibility state (persisted locally)
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('grobax_hide_balance') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBalanceHidden = useCallback(() => {
    setIsBalanceHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('grobax_hide_balance', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Authoritative real subscription status
  const isUserSubscribed = useMemo(() => {
    return checkIsUserSubscribed(currentUser);
  }, [currentUser]);

  // Central Upgrade Promotional Card State
  // Appears after 30 seconds of entering the app for free users, with a continuous 2-minute recurrence interval after dismissal
  const [isUpgradePromoVisible, setIsUpgradePromoVisible] = useState<boolean>(false);
  const dismissedAtRef = useRef<number | null>(null);
  const initialTriggerDoneRef = useRef<boolean>(false);

  // Synchronize promotion visibility when subscription status changes
  useEffect(() => {
    if (isUserSubscribed) {
      setIsUpgradePromoVisible(false);
      dismissedAtRef.current = null;
    }
  }, [isUserSubscribed]);

  // Initial 30-second entrance timer for free users
  useEffect(() => {
    if (isUserSubscribed || initialTriggerDoneRef.current) return;

    const initialTimer = setTimeout(() => {
      if (!checkIsUserSubscribed(currentUser)) {
        setIsUpgradePromoVisible(true);
        initialTriggerDoneRef.current = true;
      }
    }, 30 * 1000); // 30 seconds initial delay

    return () => clearTimeout(initialTimer);
  }, [isUserSubscribed, currentUser]);

  // 2-minute continuous recurrence timer for free users after dismissal
  useEffect(() => {
    if (isUserSubscribed) return;

    const intervalId = setInterval(() => {
      // Re-verify real subscription status from context user
      if (checkIsUserSubscribed(currentUser)) {
        setIsUpgradePromoVisible(false);
        return;
      }

      // If promo is already active/visible, do not duplicate
      if (isUpgradePromoVisible) return;

      // Check if 2-minute interval (120,000 ms) has elapsed since dismissal
      if (dismissedAtRef.current !== null) {
        const now = Date.now();
        const timeSinceDismiss = now - dismissedAtRef.current;

        // Re-display promotion every 2 minutes for free users
        if (timeSinceDismiss >= 2 * 60 * 1000) {
          setIsUpgradePromoVisible(true);
          dismissedAtRef.current = null;
        }
      }
    }, 2000); // Check every 2s

    return () => clearInterval(intervalId);
  }, [isUserSubscribed, isUpgradePromoVisible, currentUser]);

  const dismissUpgradePromo = useCallback(() => {
    setIsUpgradePromoVisible(false);
    dismissedAtRef.current = Date.now();
  }, []);

  const openWalletModal = (
    initialTab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' = 'profile'
  ) => {
    setWalletModalTab(initialTab);
    setIsWalletModalOpen(true);
  };

  // Auth Modal & Firebase User State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const login = (profile: UserProfile) => {
    setCurrentUser(profile);
    if (profile.role) {
      setRoleState(profile.role);
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('grobax_theme', newTheme);
  };

  // Synchronize theme with document.documentElement for Tailwind dark mode
  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setResolvedTheme(isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(MOCK_USERS.student);
      setRoleState('student');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Firebase Auth State Listener & Real-time Profile Listener
  useEffect(() => {
    let unsubscribeProfileSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
        unsubscribeProfileSnapshot = null;
      }

      setFirebaseUser(user);

      if (user) {
        // Guarantee user document exists in Firestore and is fully populated
        try {
          const profileDoc = await ensureUserInFirestore(user);
          setCurrentUser(profileDoc);
          setRoleState(profileDoc.role || 'student');
          if (profileDoc.dailyQaUsage?.date && profileDoc.dailyQaUsage?.count !== undefined) {
            try {
              localStorage.setItem(`grobax_daily_qa_${user.uid}_${profileDoc.dailyQaUsage.date}`, String(profileDoc.dailyQaUsage.count));
            } catch {}
          }
          if (profileDoc.academicProfileCompleted) {
            try {
              localStorage.setItem(`grobax_academic_completed_${user.uid}`, 'true');
            } catch {}
          }
        } catch (initErr) {
          console.warn('Initial profile load notice:', initErr);
        } finally {
          setIsAuthReady(true);
        }

        // Real-time snapshot listener on user document with error handling
        try {
          const userDocRef = doc(db, 'users', user.uid);
          unsubscribeProfileSnapshot = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const isLocallyDone = typeof window !== 'undefined' && localStorage.getItem(`grobax_academic_completed_${user.uid}`) === 'true';
                const academicProfileCompleted = data.academicProfileCompleted === true || isLocallyDone;

                if (academicProfileCompleted) {
                  try {
                    localStorage.setItem(`grobax_academic_completed_${user.uid}`, 'true');
                  } catch {}
                }

                setCurrentUser(prev => {
                  const isPrevMock = prev.id === 'user_student' || (prev.id && prev.id !== user.uid);
                  const isSuper = isPrimarySuperAdmin(user.uid, user.email || data.email);
                  const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'Scholar');
                  
                  const resolvedName = data.fullName || data.name || (isPrevMock ? fallbackName : prev.name);
                  const resolvedFullName = data.fullName || data.name || (isPrevMock ? fallbackName : prev.fullName);
                  const resolvedEmail = data.email || user.email || (isPrevMock ? '' : prev.email);
                  const resolvedUsername = data.username || (isPrevMock ? (user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) : (user.email ? user.email.split('@')[0] : `scholar_${user.uid.substring(0, 5)}`)) : prev.username);
                  const resolvedAvatar = data.profileImage || data.avatar || user.photoURL || (isPrevMock ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}` : prev.avatar);
                  const resolvedRole = data.role || (isSuper ? 'admin' : (isPrevMock ? 'student' : prev.role));

                  return {
                    ...prev,
                    ...data,
                    id: user.uid,
                    uid: user.uid,
                    name: resolvedName,
                    fullName: resolvedFullName,
                    email: resolvedEmail,
                    username: resolvedUsername,
                    avatar: resolvedAvatar,
                    profileImage: resolvedAvatar,
                    role: resolvedRole,
                    accountStatus: data.accountStatus || 'active',
                    academicProfileCompleted,
                    institution: data.institutionName || data.institution || (isSuper ? 'Grobax Systems Administration' : (isPrevMock ? '' : prev.institution)),
                    institutionName: data.institutionName || data.institution || (isSuper ? 'Grobax Systems Administration' : (isPrevMock ? '' : prev.institutionName)),
                    institutionCategory: data.institutionCategory || prev.institutionCategory || 'University',
                    faculty: data.facultyName || data.faculty || (isSuper ? 'HQ Overseer' : (isPrevMock ? '' : prev.faculty)),
                    facultyName: data.facultyName || data.faculty || (isSuper ? 'HQ Overseer' : (isPrevMock ? '' : prev.facultyName)),
                    facultyId: data.facultyId || prev.facultyId || '',
                    department: data.departmentName || data.department || (isSuper ? 'HQ Overseer' : (isPrevMock ? '' : prev.department)),
                    departmentName: data.departmentName || data.department || (isSuper ? 'HQ Overseer' : (isPrevMock ? '' : prev.departmentName)),
                    departmentId: data.departmentId || prev.departmentId || '',
                    level: data.level || (isSuper ? 'Executive Level' : (isPrevMock ? '100 Level' : prev.level)),
                    gpBalance: data.gpBalance !== undefined ? Number(data.gpBalance) : (isPrevMock ? 0 : (typeof prev.gpBalance === 'number' ? prev.gpBalance : 0)),
                    grbxTokens: data.grbxTokens !== undefined ? Number(data.grbxTokens) : (isPrevMock ? 0 : prev.grbxTokens),
                    stakedTokens: data.stakedTokens !== undefined ? Number(data.stakedTokens) : (isPrevMock ? 0 : prev.stakedTokens),
                    reputationPoints: data.reputationPoints !== undefined ? Number(data.reputationPoints) : (isPrevMock ? 100 : prev.reputationPoints),
                    gusRank: data.gusRank !== undefined ? Number(data.gusRank) : (isPrevMock ? 0 : prev.gusRank),
                    gusTier: data.gusTier || (isSuper ? 'Grandmaster' : (isPrevMock ? 'Scholar' : prev.gusTier)),
                    walletAddress: data.walletAddress || prev.walletAddress || `0x${user.uid.substring(0, 10)}`,
                    activePlanId: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? ''
                      : (data.activePlanId || prev.activePlanId || ''),
                    membershipTier: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? 'Free Scholar'
                      : (data.membershipTier || data.subscriptionTier || prev.membershipTier || 'Free Scholar'),
                    subscriptionTier: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? 'Free Scholar'
                      : (data.subscriptionTier || data.membershipTier || prev.subscriptionTier || 'Free Scholar'),
                    subscriptionPlan: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? ''
                      : (data.subscriptionPlan || data.membershipTier || prev.subscriptionPlan || ''),
                    planId: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? ''
                      : (data.planId || data.activePlanId || prev.planId || ''),
                    tier: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? 'Free Scholar'
                      : (data.tier || data.membershipTier || prev.tier || 'Free Scholar'),
                    plan: data.subscriptionExpiry && new Date(data.subscriptionExpiry).getTime() <= Date.now() && !isSuper
                      ? ''
                      : (data.plan || data.membershipTier || prev.plan || ''),
                    isSubscribed: isSuper || Boolean(
                      (!data.subscriptionExpiry || new Date(data.subscriptionExpiry).getTime() > Date.now()) &&
                      (data.isSubscribed || data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free')) || (data.membershipTier && !data.membershipTier.toLowerCase().includes('free') && data.membershipTier.toLowerCase() !== 'starter scholar') || prev.isSubscribed)
                    ),
                    isPremium: isSuper || Boolean(
                      (!data.subscriptionExpiry || new Date(data.subscriptionExpiry).getTime() > Date.now()) &&
                      (data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free')) || (data.membershipTier && !data.membershipTier.toLowerCase().includes('free') && data.membershipTier.toLowerCase() !== 'starter scholar') || prev.isPremium)
                    ),
                    subscriptionExpiry: data.subscriptionExpiry || prev.subscriptionExpiry || '',
                    subscription: data.subscription || prev.subscription || undefined,
                    privacy: data.privacy || prev.privacy || {
                      showInstitution: true,
                      showFaculty: true,
                      showDepartment: true,
                      showLevel: true,
                      institutionVisibility: 'Public',
                      departmentVisibility: 'Public',
                      levelVisibility: 'Public',
                      showAcademicInfoOnPosts: true,
                    },
                    badges: data.badges || prev.badges || [],
                    purchasedBadgeIds: data.purchasedBadgeIds || prev.purchasedBadgeIds || [],
                    dailyQaUsage: data.dailyQaUsage || prev.dailyQaUsage || undefined,
                  };
                });

                if (data.dailyQaUsage?.date && data.dailyQaUsage?.count !== undefined) {
                  try {
                    localStorage.setItem(`grobax_daily_qa_${user.uid}_${data.dailyQaUsage.date}`, String(data.dailyQaUsage.count));
                  } catch {}
                }

                if (data.role) {
                  setRoleState(data.role);
                }
              }
            },
            (error) => {
              console.warn('User profile snapshot listener notice:', error.message || error);
            }
          );
        } catch (e) {
          console.warn('Could not establish user profile snapshot:', e);
        }
      } else {
        // Reset to guest / default
        setFirebaseUser(null);
        setCurrentUser(MOCK_USERS.student);
        setRoleState('student');
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
      }
    };
  }, []);

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_community_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_FEED_POSTS;
  });
  const [chatroomMessages, setChatroomMessages] = useState<ChatroomLiveMessage[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_chatroom_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MOCK_CHATROOM_MESSAGES;
  });
  const [events, setEvents] = useState<EventItem[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_platform_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MOCK_EVENTS;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [badgeStore, setBadgeStore] = useState<BadgeStoreItem[]>(MOCK_BADGES_STORE);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [masterInstitutions, setMasterInstitutions] = useState<MasterInstitution[]>([]);
  const [seasons, setSeasons] = useState<LeagueSeason[]>(MOCK_SEASONS);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(MOCK_QUESTION_SETS);
  const [qualificationCompetitions, setQualificationCompetitions] = useState<QualificationCompetition[]>(MOCK_QUALIFICATION_COMPETITIONS);
  const [representativeRecords, setRepresentativeRecords] = useState<RepresentativeRecord[]>(MOCK_REPRESENTATIVE_RECORDS);
  const [representativeAssignments, setRepresentativeAssignments] = useState<RepresentativeAssignment[]>([]);
  const [fixtures, setFixtures] = useState<LeagueFixture[]>(MOCK_FIXTURES);

  // Grobax Minimart State
  const [minimartProducts, setMinimartProducts] = useState<MinimartProduct[]>(() => {
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('grobax_deleted_minimart_products') || '[]'));
      return INITIAL_MINIMART_PRODUCTS.filter(
        p => p.status !== 'removed' && !deletedIds.has(p.id) && !deletedIds.has(p.productId)
      );
    } catch {
      return INITIAL_MINIMART_PRODUCTS;
    }
  });
  const [minimartCategories, setMinimartCategories] = useState<MinimartCategory[]>(INITIAL_MINIMART_CATEGORIES);
  const [minimartConfig, setMinimartConfig] = useState<MinimartConfig>(DEFAULT_MINIMART_CONFIG);
  const [minimartReports, setMinimartReports] = useState<MinimartReport[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [sponsorshipCampaigns, setSponsorshipCampaigns] = useState<SponsorshipCampaign[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_sponsorships');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return MOCK_SPONSORSHIP_CAMPAIGNS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gpConversionConfig, setGpConversionConfig] = useState<GpConversionConfig>(MOCK_GP_CONVERSION);
  const [upgradePlans, setUpgradePlans] = useState<UpgradePlan[]>(MOCK_UPGRADE_PLANS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  // GUS State
  const [gusSeasons, setGusSeasons] = useState<GusSeason[]>(MOCK_GUS_SEASONS);
  const [gusParticipants, setGusParticipants] = useState<GusParticipantRecord[]>(MOCK_GUS_PARTICIPANTS);

  const activeGusSeason = gusSeasons.find(s => s.status === 'Live' || s.status === 'Registration Open') || gusSeasons[0] || null;

  const userGusRecord = gusParticipants.find(p => p.userId === currentUser.id) || null;

  // Active question calculation for live clock
  const currentRound = activeGusSeason?.rounds[activeGusSeason.currentRoundIndex] || null;
  const currentQ = currentRound?.questions[activeGusSeason?.currentQuestionIndex || 0] || null;

  const gusLiveClock: GusLiveClockState | null = activeGusSeason ? {
    seasonId: activeGusSeason.id,
    roundNumber: currentRound ? currentRound.roundNumber : 1,
    questionNumber: (activeGusSeason.currentQuestionIndex || 0) + 1,
    totalQuestionsInRound: currentRound ? currentRound.questions.length : 0,
    currentQuestion: currentQ,
    questionStartAt: Date.now(),
    questionEndAt: Date.now() + (currentQ?.timeLimitSeconds || 15) * 1000,
    secondsRemaining: currentQ?.timeLimitSeconds || 15,
    competitionStatus: activeGusSeason.status === 'Live' ? 'QUESTION_LIVE' : 'WAITING',
    totalParticipantsCount: activeGusSeason.registeredParticipantIds.length + 35000,
    activeParticipantsCount: activeGusSeason.activeParticipantIds.length + 28400,
    eliminatedParticipantsCount: activeGusSeason.eliminatedParticipantIds.length + 6600,
  } : null;

  const registerForGusSeason = (seasonId: string): boolean => {
    const targetSeason = gusSeasons.find(s => s.id === seasonId);
    if (targetSeason && targetSeason.registeredParticipantIds.includes(currentUser.id)) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`gus_registered_${seasonId}_${currentUser.id}`, 'true');
        }
      } catch {}
      return false; // Already registered
    }

    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      if (s.registeredParticipantIds.includes(currentUser.id)) return s;
      return {
        ...s,
        registeredParticipantIds: [...s.registeredParticipantIds, currentUser.id],
        activeParticipantIds: [...s.activeParticipantIds, currentUser.id],
      };
    }));

    setGusParticipants(prev => {
      const existing = prev.find(p => p.userId === currentUser.id);
      if (existing) {
        return prev.map(p => p.userId === currentUser.id ? { ...p, registrationStatus: 'REGISTERED', status: 'ACTIVE', seasonId } : p);
      }
      const newRec: GusParticipantRecord = {
        userId: currentUser.id,
        competitionId: seasonId,
        seasonId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        institution: currentUser.institution,
        department: currentUser.department,
        level: currentUser.level,
        registrationStatus: 'REGISTERED',
        status: 'ACTIVE',
        currentRound: 1,
        currentQuestion: 1,
        questionsCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        registeredAt: new Date().toISOString().split('T')[0],
      };
      return [...prev, newRec];
    });

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`gus_registered_${seasonId}_${currentUser.id}`, 'true');
      }
    } catch {}

    return true;
  };

  const submitGusAnswer = (
    seasonId: string,
    roundNumber: number,
    questionIndex: number,
    selectedOptionIndex: number
  ) => {
    const season = gusSeasons.find(s => s.id === seasonId);
    if (!season) return { isCorrect: false, isEliminated: true };

    const round = season.rounds.find(r => r.roundNumber === roundNumber) || season.rounds[0];
    const q = round?.questions[questionIndex];
    if (!q) return { isCorrect: false, isEliminated: true };

    const isCorrect = selectedOptionIndex === (q.correctOptionIndex ?? 0);

    if (isCorrect) {
      setGusParticipants(prev => prev.map(p => {
        if (p.userId !== currentUser.id) return p;
        return {
          ...p,
          questionsCompleted: p.questionsCompleted + 1,
          correctAnswers: p.correctAnswers + 1,
          currentQuestion: questionIndex + 2,
        };
      }));
      return { isCorrect: true, isEliminated: false };
    } else {
      setGusParticipants(prev => prev.map(p => {
        if (p.userId !== currentUser.id) return p;
        return {
          ...p,
          questionsCompleted: p.questionsCompleted + 1,
          incorrectAnswers: p.incorrectAnswers + 1,
          status: 'ELIMINATED',
          eliminatedAtRound: roundNumber,
          eliminatedAtQuestion: questionIndex + 1,
          eliminationReason: 'Wrong Answer',
        };
      }));

      setGusSeasons(prev => prev.map(s => {
        if (s.id !== seasonId) return s;
        return {
          ...s,
          activeParticipantIds: s.activeParticipantIds.filter(id => id !== currentUser.id),
          eliminatedParticipantIds: [...s.eliminatedParticipantIds.filter(id => id !== currentUser.id), currentUser.id],
        };
      }));

      return { isCorrect: false, isEliminated: true };
    }
  };

  const addGusSeason = (seasonData: Omit<GusSeason, 'id' | 'registeredParticipantIds' | 'activeParticipantIds' | 'eliminatedParticipantIds' | 'winners'>) => {
    const newId = 'gus_s_' + Date.now();
    const newSeason: GusSeason = {
      ...seasonData,
      id: newId,
      registeredParticipantIds: [],
      activeParticipantIds: [],
      eliminatedParticipantIds: [],
      winners: [],
    };
    setGusSeasons(prev => [newSeason, ...prev]);
  };

  const updateGusSeason = (seasonId: string, patch: Partial<GusSeason>) => {
    setGusSeasons(prev => prev.map(s => s.id === seasonId ? { ...s, ...patch } : s));
  };

  const addGusRoundToSeason = (seasonId: string, roundData: Omit<GusRound, 'id'>) => {
    const newRoundId = 'rnd_' + Date.now();
    const newRound: GusRound = { ...roundData, id: newRoundId };
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return { ...s, rounds: [...s.rounds, newRound] };
    }));
  };

  const updateGusRoundInSeason = (seasonId: string, roundId: string, patch: Partial<GusRound>) => {
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        rounds: s.rounds.map(r => r.id === roundId ? { ...r, ...patch } : r),
      };
    }));
  };

  const addQuestionToGusRound = (seasonId: string, roundId: string, questionData: Omit<QuestionItem, 'id'>) => {
    const qId = 'gus_q_' + Date.now();
    const newQ: QuestionItem = { ...questionData, id: qId };
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        rounds: s.rounds.map(r => {
          if (r.id !== roundId) return r;
          return { ...r, questions: [...r.questions, newQ] };
        }),
      };
    }));
  };

  const updateGusPrizes = (seasonId: string, prizes: GusPrizeConfig[]) => {
    setGusSeasons(prev => prev.map(s => s.id === seasonId ? { ...s, prizes } : s));
  };

  const adminControlGusCompetition = (
    seasonId: string,
    action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_ROUND' | 'START_NEXT_ROUND' | 'END_COMPETITION'
  ) => {
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      if (action === 'START') {
        return { ...s, status: 'Live', currentRoundIndex: 0, currentQuestionIndex: 0 };
      }
      if (action === 'NEXT_QUESTION') {
        const curRound = s.rounds[s.currentRoundIndex];
        if (curRound && s.currentQuestionIndex + 1 < curRound.questions.length) {
          return { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 };
        }
      }
      if (action === 'START_NEXT_ROUND') {
        if (s.currentRoundIndex + 1 < s.rounds.length) {
          return { ...s, currentRoundIndex: s.currentRoundIndex + 1, currentQuestionIndex: 0 };
        }
      }
      if (action === 'END_COMPETITION') {
        return { ...s, status: 'Completed' };
      }
      return s;
    }));
  };

  // ==========================================
  // DOME State & Logic
  // ==========================================
  const [domeSessions, setDomeSessions] = useState<DomeSession[]>(MOCK_DOME_SESSIONS);
  const [domeScoreboard, setDomeScoreboard] = useState<DomeScoreboardEntry[]>(MOCK_DOME_SCOREBOARD);
  const [domeUserProgress, setDomeUserProgress] = useState<DomeUserProgress>(MOCK_DOME_USER_PROGRESS);
  const [domeHistory] = useState<DomeHistoryItem[]>(MOCK_DOME_HISTORY);

  const activeDomeSession = domeSessions.find(s => s.status === 'Live' || s.status === 'Scheduled') || domeSessions[0] || null;

  const currentDomeQ = activeDomeSession?.questions[activeDomeSession?.currentQuestionIndex || 0] || null;

  const domeLiveClock: DomeLiveClockState | null = activeDomeSession ? {
    sessionId: activeDomeSession.id,
    questionNumber: (activeDomeSession.currentQuestionIndex || 0) + 1,
    totalQuestions: activeDomeSession.questions.length || activeDomeSession.totalQuestions,
    currentQuestion: currentDomeQ,
    questionStartAt: activeDomeSession.questionStartAt || Date.now(),
    questionEndAt: activeDomeSession.questionEndAt || (Date.now() + 15000),
    secondsRemaining: currentDomeQ?.timeLimitSeconds || 15,
    sessionStatus: activeDomeSession.status,
    activeParticipantsCount: activeDomeSession.participantsCount,
    answersReceivedCount: Math.floor(activeDomeSession.participantsCount * 0.88),
    correctCount: Math.floor(activeDomeSession.participantsCount * 0.62),
    incorrectCount: Math.floor(activeDomeSession.participantsCount * 0.26),
    avgResponseTimeSeconds: 4.8,
    totalGpDistributed: activeDomeSession.totalGpDistributed,
  } : null;

  const submitDomeAnswer = (
    sessionId: string,
    questionIndex: number,
    selectedOptionIndex: number | null
  ) => {
    const session = domeSessions.find(s => s.id === sessionId);
    if (!session) return { isCorrect: false, gpEarned: 0 };

    const q = session.questions[questionIndex];
    if (!q) return { isCorrect: false, gpEarned: 0 };

    const isCorrect = selectedOptionIndex !== null && selectedOptionIndex === q.correctOptionIndex;
    const gpEarned = isCorrect ? (q.gpReward || session.gpRewardPerQuestion || 10) : 0;

    // 1. Update user progress in Dome
    setDomeUserProgress(prev => {
      const isMissed = selectedOptionIndex === null;
      const newAnswered = prev.questionsAnswered + 1;
      const newCorrect = prev.correct + (isCorrect ? 1 : 0);
      const newIncorrect = prev.incorrect + (!isCorrect && !isMissed ? 1 : 0);
      const newMissed = prev.missed + (isMissed ? 1 : 0);
      const newGp = prev.gpEarned + gpEarned;
      const accuracy = Math.round((newCorrect / newAnswered) * 100);

      return {
        ...prev,
        questionsAnswered: newAnswered,
        correct: newCorrect,
        incorrect: newIncorrect,
        missed: newMissed,
        gpEarned: newGp,
        accuracy,
        userAnswers: {
          ...prev.userAnswers,
          [questionIndex]: {
            selectedOption: selectedOptionIndex,
            isCorrect,
            gpEarned,
          },
        },
      };
    });

    // 2. Award GP to user balance if correct
    if (isCorrect && gpEarned > 0) {
      const newGp = currentUser.gpBalance + gpEarned;
      setCurrentUser(prev => ({
        ...prev,
        gpBalance: prev.gpBalance + gpEarned,
      }));

      if (firebaseUser) {
        updateUserProfileInFirestore(firebaseUser.uid, {
          gpBalance: newGp,
        }).catch(err => console.warn('Dome GP firestore sync notice:', err));
      }

      // Record authoritative transaction log entry for user & admin panels
      addTransaction({
        type: 'gp_earned',
        amount: gpEarned,
        unit: 'GP',
        title: 'Dome Speed Quiz Reward',
        description: `Earned ${gpEarned} GP for correct answer in Speed Quiz session`,
        isCredit: true,
        userId: firebaseUser?.uid || currentUser.id,
        userName: currentUser.name || currentUser.fullName || 'Scholar',
        userEmail: currentUser.email || currentUser.username || '',
        userAvatar: currentUser.avatar || '',
        institutionName: currentUser.institution || currentUser.institutionName || '',
        status: 'completed',
      });

      // Update session total GP distributed
      setDomeSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return { ...s, totalGpDistributed: s.totalGpDistributed + gpEarned };
      }));

      // Update user's score on live scoreboard
      setDomeScoreboard(prev => {
        const existing = prev.find(p => p.userId === currentUser.id);
        if (existing) {
          const updated = prev.map(p => {
            if (p.userId !== currentUser.id) return p;
            return {
              ...p,
              correctAnswers: p.correctAnswers + 1,
              questionsAnswered: p.questionsAnswered + 1,
              gpEarned: p.gpEarned + gpEarned,
            };
          });
          return updated.sort((a, b) => b.gpEarned - a.gpEarned).map((p, idx) => ({ ...p, rank: idx + 1 }));
        } else {
          const newEntry: DomeScoreboardEntry = {
            rank: prev.length + 1,
            userId: currentUser.id,
            username: currentUser.name,
            avatar: currentUser.avatar,
            institution: currentUser.institution,
            correctAnswers: 1,
            questionsAnswered: 1,
            gpEarned,
          };
          return [...prev, newEntry].sort((a, b) => b.gpEarned - a.gpEarned).map((p, idx) => ({ ...p, rank: idx + 1 }));
        }
      });
    }

    return { isCorrect, gpEarned };
  };

  const addDomeSession = (sessionData: Omit<DomeSession, 'id' | 'participantsCount' | 'totalGpDistributed' | 'currentQuestionIndex'>) => {
    const newId = 'dome_s_' + Date.now();
    const newSession: DomeSession = {
      ...sessionData,
      id: newId,
      participantsCount: 0,
      totalGpDistributed: 0,
      currentQuestionIndex: 0,
    };
    setDomeSessions(prev => [newSession, ...prev]);
  };

  const updateDomeSession = (sessionId: string, patch: Partial<DomeSession>) => {
    setDomeSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...patch } : s));
  };

  const addQuestionToDomeSession = (sessionId: string, questionData: Omit<DomeQuestionItem, 'id'>) => {
    const qId = 'dq_' + Date.now();
    const newQ: DomeQuestionItem = { ...questionData, id: qId };
    setDomeSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updatedQuestions = [...s.questions, newQ];
      return {
        ...s,
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
      };
    }));
  };

  const adminControlDomeSession = (
    sessionId: string,
    action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_SESSION'
  ) => {
    setDomeSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;

      if (action === 'START') {
        const firstQ = s.questions[0];
        return {
          ...s,
          status: 'Live',
          currentQuestionIndex: 0,
          questionStartAt: Date.now(),
          questionEndAt: Date.now() + (firstQ?.timeLimitSeconds || 15) * 1000,
        };
      }
      if (action === 'PAUSE') {
        return { ...s, status: 'Paused' };
      }
      if (action === 'RESUME') {
        const curQ = s.questions[s.currentQuestionIndex];
        return {
          ...s,
          status: 'Live',
          questionStartAt: Date.now(),
          questionEndAt: Date.now() + (curQ?.timeLimitSeconds || 15) * 1000,
        };
      }
      if (action === 'NEXT_QUESTION') {
        if (s.currentQuestionIndex + 1 < s.questions.length) {
          const nextIdx = s.currentQuestionIndex + 1;
          const nextQ = s.questions[nextIdx];
          return {
            ...s,
            currentQuestionIndex: nextIdx,
            questionStartAt: Date.now(),
            questionEndAt: Date.now() + (nextQ?.timeLimitSeconds || 15) * 1000,
          };
        } else {
          return { ...s, status: 'Completed' };
        }
      }
      if (action === 'END_SESSION') {
        return { ...s, status: 'Completed' };
      }

      return s;
    }));
  };

  // Sync current user profile whenever role changes
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (firebaseUser?.uid) {
      setCurrentUser(prev => ({
        ...prev,
        role: newRole,
      }));
      updateUserProfileInFirestore(firebaseUser.uid, { role: newRole }).catch(err => {
        console.warn('Could not update role in Firestore:', err);
      });
    } else {
      if (MOCK_USERS[newRole]) {
        setCurrentUser(MOCK_USERS[newRole]);
      }
    }
  };

  const toggleRepresentativeStatus = () => {
    setCurrentUser(prev => ({
      ...prev,
      isRepresentative: !prev.isRepresentative,
    }));
  };

  // Theme resolution logic
  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let effectiveTheme: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = theme;
    }

    setResolvedTheme(effectiveTheme);

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle system preference changes if in system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const effective = e.matches ? 'dark' : 'light';
      setResolvedTheme(effective);
      if (effective === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Master Institutions Listener using Grobax Master Data Access Layer
  // Institutions & Academic Master Data - Cached single fetch with localStorage persistence
  useEffect(() => {
    try {
      const cached = localStorage.getItem('grobax_saved_institutions_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMasterInstitutions(parsed);
        }
      }
    } catch {}

    // Efficient list fetch with in-memory cache and 1-hour TTL
    institutionRepo.list({ useCache: true, ttlMs: 3600000 }).then((list) => {
      if (list && list.length > 0) {
        setMasterInstitutions(list);
        try {
          localStorage.setItem('grobax_saved_institutions_list', JSON.stringify(list));
        } catch {}
      }
    }).catch((err) => {
      console.warn('Institutions fetch notice (using cache):', err);
    });
  }, []);

  // System Settings & Platform Configuration using Grobax Master Data Engine
  useEffect(() => {
    try {
      const unsubSettings = grobaxDataService.subscribeDoc<SystemSettings>(
        'system_settings',
        'config',
        (data) => {
          if (data) {
            setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...data } as SystemSettings);
            if (typeof data.gpToFiatRate === 'number' || typeof data.minWithdrawalAmountGp === 'number') {
              setGpConversionConfig(prev => ({
                ...prev,
                ...(typeof data.gpToFiatRate === 'number' ? { gpToFiatRate: data.gpToFiatRate } : {}),
                ...(typeof data.minWithdrawalAmountGp === 'number' ? { minimumWithdrawalGP: data.minWithdrawalAmountGp } : {}),
              }));
            }
          }
        },
        (error) => {
          console.warn('System settings live snapshot notice:', error);
        }
      );

      const unsubGp = grobaxDataService.subscribeDoc<GpConversionConfig>(
        'system_settings',
        'gp_conversion',
        (data) => {
          if (data) {
            setGpConversionConfig(prev => ({ ...prev, ...DEFAULT_GP_CONVERSION, ...data }));
          }
        },
        (error) => {
          console.warn('GP conversion live snapshot notice:', error);
        }
      );

      return () => {
        unsubSettings();
        unsubGp();
      };
    } catch (err) {
      console.warn('Live settings subscription init notice:', err);
    }
  }, []);

  // Firestore Real-Time Listener for Notifications & Admin Broadcasts (User-Scoped, limit 20)
  useEffect(() => {
    try {
      const currentUid = firebaseUser?.uid || currentUser.id;
      const currentRole = currentUser.role || 'student';
      const isUserRep = Boolean(currentUser.isRepresentative);
      const isUserAdmin = currentRole === 'admin' || currentRole === 'super_admin' || Boolean((currentUser as any)?.managerRole);

      const notifQuery = query(collection(db, 'notifications'), limit(20));
      const unsubNotifs = onSnapshot(
        notifQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            // Read stored read-notification ids from localStorage scoped to this specific user
            let readIds: string[] = [];
            try {
              const storageKey = `grobax_read_notifs_${currentUid}`;
              const stored = localStorage.getItem(storageKey) || localStorage.getItem('grobax_read_notifs');
              if (stored) readIds = JSON.parse(stored);
            } catch (e) {
              console.warn('Local read notifs parse notice:', e);
            }

            const rawNotifs: NotificationItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                title: data.title || 'Platform Notification',
                message: data.message || '',
                type: data.type || 'system',
                timestamp: data.timestamp || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'),
                isRead: Boolean(data.isRead) || readIds.includes(docSnap.id),
                actionUrl: data.actionUrl || '',
                userId: data.userId || undefined,
                targetUserId: data.targetUserId || data.userId || undefined,
                targetRole: data.targetRole || undefined,
                excludeUserId: data.excludeUserId || undefined,
                createdAtMs: data.createdAtMillis || (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()),
              };
            });

            // Filter strictly for this specific user so User A and User B receive isolated notifications
            const userScopedNotifs = rawNotifs.filter((notif) => {
              // Exclude creator if set
              if (notif.excludeUserId && notif.excludeUserId === currentUid) return false;

              // If targeted to a specific user ID
              if (notif.targetUserId || notif.userId) {
                const target = notif.targetUserId || notif.userId;
                return target === currentUid || target === currentUser.username || target === currentUser.id;
              }

              // Filter out legacy or untargeted personal upgrade / account activity items
              const lowerTitle = (notif.title || '').toLowerCase();
              const lowerMsg = (notif.message || '').toLowerCase();
              if (
                lowerTitle.includes('upgraded to') ||
                lowerMsg.includes('membership has been upgraded') ||
                lowerTitle.includes('recharge successful') ||
                lowerTitle.includes('withdrawal request') ||
                lowerTitle.includes('reward claimed')
              ) {
                return false;
              }

              // If targeted to a specific role
              if (notif.targetRole && notif.targetRole !== 'ALL') {
                if (notif.targetRole === 'admin') return isUserAdmin;
                if (notif.targetRole === 'representative') return isUserRep;
                if (notif.targetRole === 'student') return !isUserAdmin;
                return notif.targetRole === currentRole;
              }

              // Broadcast for all users (genuine platform announcements, league alerts, arena matches)
              return notif.type === 'announcement' || notif.type === 'dome' || notif.type === 'league' || notif.type === 'gus';
            });

            // Sort newest first
            userScopedNotifs.sort((a, b) => ((b as any).createdAtMs || 0) - ((a as any).createdAtMs || 0));

            const finalNotifs = userScopedNotifs.length > 0 ? userScopedNotifs : DEFAULT_NOTIFICATIONS;
            setNotifications(finalNotifs);
            try {
              localStorage.setItem('grobax_saved_notifications', JSON.stringify(finalNotifs));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_notifications');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setNotifications(parsed);
                  return;
                }
              }
            } catch {}
            setNotifications(DEFAULT_NOTIFICATIONS);
          }
        },
        (error) => {
          console.warn('Notifications live snapshot notice (using fallback):', error);
          try {
            const cached = localStorage.getItem('grobax_saved_notifications');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setNotifications(parsed);
                return;
              }
            }
          } catch {}
          setNotifications(DEFAULT_NOTIFICATIONS);
        }
      );
      return () => unsubNotifs();
    } catch (err) {
      console.warn('Live notifications subscription init notice:', err);
      setNotifications(DEFAULT_NOTIFICATIONS);
    }
  }, [currentUser.id, currentUser.role, currentUser.isRepresentative, currentUser.username, firebaseUser?.uid]);

  // Firestore Real-Time Listener for Platform Events Catalog (limit 20 with cache)
  useEffect(() => {
    try {
      const eventsQuery = query(collection(db, 'platformEvents'), limit(20));
      const unsubEvents = onSnapshot(
        eventsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveEvents: EventItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                eventId: docSnap.id,
                title: data.title || '',
                category: data.category || 'institutional_league',
                categoryLabel: data.categoryLabel,
                host: data.host || OFFICIAL_EVENT_HOST,
                startDate: data.startDate || '',
                endDate: data.endDate || '',
                eventTime: data.eventTime || data.time || '18:00 UTC',
                prizeReward: data.prizeReward || data.prizePool || '',
                audience: data.audience || 'all_users',
                description: data.description || '',
                imageUrl: data.imageUrl || data.image || '',
                imageStoragePath: data.imageStoragePath || '',
                status: data.status || 'Published',
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                publishedAt: data.publishedAt,
                // Backward compatibility aliases
                date: data.startDate && data.endDate ? `${data.startDate} to ${data.endDate}` : data.date || '',
                time: data.eventTime || data.time || '18:00 UTC',
                prizePool: data.prizeReward || data.prizePool || '',
                institutionHost: data.host || OFFICIAL_EVENT_HOST,
                image: data.imageUrl || data.image || '',
                participantsCount: data.participantsCount || 0,
                maxParticipants: data.maxParticipants || 0,
                isRegistered: data.isRegistered || false,
              };
            });
            setEvents(liveEvents);
            try {
              localStorage.setItem('grobax_saved_platform_events', JSON.stringify(liveEvents));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_platform_events');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setEvents(parsed);
                  return;
                }
              }
            } catch {}
          }
        },
        (error) => {
          console.warn('Platform Events live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_saved_platform_events');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEvents(parsed);
              }
            }
          } catch {}
        }
      );
      return () => unsubEvents();
    } catch (err) {
      console.warn('Platform Events subscription init notice:', err);
    }
  }, []);

  // Firestore Real-Time Listener for Central Representative System (limit 30)
  useEffect(() => {
    try {
      const repQuery = query(collection(db, 'representativeAssignments'), limit(30));
      const unsubRep = onSnapshot(
        repQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAssignments: RepresentativeAssignment[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              liveAssignments.push({
                id: docSnap.id,
                assignmentId: docSnap.id,
                userId: data.userId || '',
                userName: data.userName || 'Representative',
                userUsername: data.userUsername || '',
                userAvatar: data.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
                institutionId: data.institutionId || '',
                institutionName: data.institutionName || 'Member Institution',
                department: data.department || '',
                level: data.level || '',
                seasonId: data.seasonId || '',
                seasonName: data.seasonName || '',
                category: data.category || 'University',
                qualificationScore: data.qualificationScore || 0,
                qualificationRank: data.qualificationRank || 1,
                selectedByAdminId: data.selectedByAdminId || '',
                selectedByAdminName: data.selectedByAdminName || '',
                selectedAt: data.selectedAt || new Date().toISOString(),
                status: data.status || 'active',
              });
            });
            setRepresentativeAssignments(liveAssignments);

            // Synchronize legacy representativeRecords
            const activeReps: RepresentativeRecord[] = liveAssignments
              .filter((a) => a.status === 'active')
              .map((a) => ({
                id: a.id || a.assignmentId,
                studentId: a.userId,
                studentName: a.userName,
                avatar: a.userAvatar,
                institutionId: a.institutionId,
                institutionName: a.institutionName,
                department: a.department,
                level: a.level,
                seasonId: a.seasonId,
                qualificationScore: a.qualificationScore || 100,
                selectionStatus: 'Selected',
                selectionDate: a.selectedAt ? a.selectedAt.split('T')[0] : new Date().toISOString().split('T')[0],
              }));
            if (activeReps.length > 0) {
              setRepresentativeRecords(activeReps);
            }
          }
        },
        (error) => {
          console.warn('Representative Assignments snapshot notice:', error);
        }
      );
      return () => unsubRep();
    } catch (err) {
      console.warn('Representative Assignments subscription init notice:', err);
    }
  }, []);

  // Firestore Real-Time Listener for Community Posts, Announcements & Chatroom (Optimized Quota Limits)
  useEffect(() => {
    try {
      // Community Posts (Limit 100 for comprehensive live feed)
      const postsQuery = query(collection(db, 'posts'), limit(100));
      const unsubPosts = onSnapshot(
        postsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const livePosts: Post[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const authData = data.author || {};
              const isPrem = Boolean(
                authData.isPremium ||
                (authData.membershipTier && !authData.membershipTier.toLowerCase().includes('free')) ||
                (authData.subscriptionTier && !authData.subscriptionTier.toLowerCase().includes('free'))
              );
              const isCm = Boolean(
                authData.isCommunityManager ||
                authData.role === 'community_manager' ||
                (authData.name && authData.name.toLowerCase().includes('community manager'))
              );
              const isStaff = Boolean(
                authData.isStaffOrAdmin ||
                authData.role === 'admin' ||
                authData.role === 'super_admin' ||
                (authData.name && (authData.name.toLowerCase().includes('admin') || authData.name.toLowerCase().includes('staff')))
              );

              const createdAtMillis =
                data.createdAt?.toMillis ? data.createdAt.toMillis() :
                (typeof data.createdAtMillis === 'number' ? data.createdAtMillis :
                (docSnap.id.startsWith('post_') && !isNaN(Number(docSnap.id.split('_')[1])) ? Number(docSnap.id.split('_')[1]) :
                (data.timestamp === 'Just now' ? Date.now() : 0)));

              return {
                id: docSnap.id,
                author: {
                  name: authData.name || 'Anonymous Scholar',
                  username: authData.username || '@scholar',
                  avatar: authData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  role: authData.role || 'student',
                  isRepresentative: authData.isRepresentative,
                  institution: authData.institution || 'Grobax Scholar',
                  department: authData.department,
                  level: authData.level,
                  privacy: authData.privacy,
                  badges: Array.isArray(authData.badges) ? authData.badges : [],
                  equippedBadge: authData.equippedBadge,
                  membershipTier: authData.membershipTier || authData.subscriptionTier,
                  subscriptionTier: authData.subscriptionTier,
                  isPremium: isPrem,
                  isStaffOrAdmin: isStaff,
                  isCommunityManager: isCm,
                  verified: authData.verified !== undefined ? authData.verified : (isPrem || isStaff || isCm),
                },
                content: data.content || '',
                image: data.image || (data.attachments?.type === 'image' ? data.attachments.data : undefined),
                timestamp: data.timestamp || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'),
                tags: Array.isArray(data.tags) ? data.tags : [],
                likes: typeof data.likes === 'number' ? data.likes : 0,
                commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : (Array.isArray(data.commentsList) ? data.commentsList.length : 0),
                commentsList: Array.isArray(data.commentsList) ? data.commentsList : [],
                shares: typeof data.shares === 'number' ? data.shares : 0,
                isLiked: Boolean(data.isLiked),
                status: data.status || 'Published',
                attachments: data.attachments,
                reports: Array.isArray(data.reports) ? data.reports : [],
                isAiGenerated: Boolean(data.isAiGenerated),
                createdAtMillis,
              } as Post;
            });

            // Sort posts by creation time descending (latest posts at the top)
            livePosts.sort((a: any, b: any) => {
              const timeA = a.createdAtMillis || 0;
              const timeB = b.createdAtMillis || 0;
              return timeB - timeA;
            });

            setPosts(livePosts);
            try {
              localStorage.setItem('grobax_saved_community_posts', JSON.stringify(livePosts));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_community_posts');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setPosts(parsed);
                  return;
                }
              }
            } catch {}
            setPosts(INITIAL_FEED_POSTS);
          }
        },
        (error) => {
          console.warn('Community posts live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_saved_community_posts');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPosts(parsed);
              }
            }
          } catch {}
        }
      );

      // Announcements (Limit 15)
      const annQuery = query(collection(db, 'announcements'), limit(15));
      const unsubAnn = onSnapshot(
        annQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAnn: Announcement[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                title: data.title || '',
                content: data.content || '',
                category: data.category || 'Official',
                author: data.author || 'Admin Desk',
                authorRole: data.authorRole || 'Academic Affairs',
                authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                date: data.date || 'Recent',
                status: data.status || 'Published',
                priority: data.priority || 'Medium',
                isPinned: Boolean(data.isPinned),
                image: data.image,
                important: data.important,
              };
            });
            setAnnouncements(liveAnn);
          }
        },
        (error) => {
          console.warn('Announcements live snapshot notice:', error);
        }
      );

      // Chatroom Live Messages (Limit 100 for continuous real-time stream)
      const chatQuery = query(collection(db, 'chatroom_live_messages'), limit(100));
      const unsubChat = onSnapshot(
        chatQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveMsgs: ChatroomLiveMessage[] = snapshot.docs
              .map((d) => {
                const data = d.data();
                const parsedTimestamp =
                  typeof data.timestamp === 'number'
                    ? data.timestamp
                    : typeof data.createdAtMillis === 'number'
                    ? data.createdAtMillis
                    : data.createdAt?.toMillis
                    ? data.createdAt.toMillis()
                    : typeof data.createdAt === 'number'
                    ? data.createdAt
                    : (d.id.startsWith('msg_') && !isNaN(Number(d.id.split('_')[1])) ? Number(d.id.split('_')[1]) : Date.now());

                return {
                  id: d.id,
                  ...data,
                  reactions: data.reactions && typeof data.reactions === 'object' ? data.reactions : {},
                  timestamp: parsedTimestamp,
                } as ChatroomLiveMessage;
              })
              .filter((m) => !m.isDeleted)
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            setChatroomMessages(liveMsgs);
            try {
              localStorage.setItem('grobax_chatroom_messages', JSON.stringify(liveMsgs));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_chatroom_messages');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setChatroomMessages(parsed);
                  return;
                }
              }
            } catch {}
            setChatroomMessages(MOCK_CHATROOM_MESSAGES);
          }
        },
        (error) => {
          console.warn('Chatroom live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_chatroom_messages');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatroomMessages(parsed);
              }
            }
          } catch {}
        }
      );

      return () => {
        unsubPosts();
        unsubAnn();
        unsubChat();
      };
    } catch (err) {
      console.warn('Community posts and announcements listener init notice:', err);
    }
  }, []);

  // Real-Time Listeners for Grobax Minimart & Wallet Engine (Quota-Optimized & Scoped)
  useEffect(() => {
    seedInitialMinimartDataToFirestore();

    const currentUid = firebaseUser?.uid || currentUser.id;
    const currentRole = currentUser.role || 'student';
    const isUserAdmin = currentRole === 'admin' || currentRole === 'super_admin' || Boolean((currentUser as any)?.managerRole);

    // 1. Minimart Config Listener
    const unsubConfig = minimartRepo.subscribeConfig((config) => {
      if (config) {
        setMinimartConfig(config);
      }
    });

    // 2. Minimart Categories Listener
    const unsubCategories = minimartRepo.subscribeCategories((cats) => {
      if (cats && cats.length > 0) {
        setMinimartCategories(cats);
      }
    });

    // 3. Minimart Products Listener (Limit 30 with sorting)
    const unsubProducts = grobaxDataService.subscribe<any>(
      'minimartProducts',
      { limit: 30, orderBy: [{ field: 'createdAt', direction: 'desc' }] },
      (prods) => {
        let deletedIds = new Set<string>();
        try {
          deletedIds = new Set(JSON.parse(localStorage.getItem('grobax_deleted_minimart_products') || '[]'));
        } catch {}

        const activeProds = prods.filter(
          (p: any) => p.status !== 'removed' && !deletedIds.has(p.id) && !deletedIds.has(p.productId)
        );

        // Auto-mark expired products
        const now = Date.now();
        const processed = activeProds.map((p: any) => {
          if (p.status === 'active' && p.expiresAt) {
            const expTime = new Date(p.expiresAt).getTime();
            if (now >= expTime) {
              return { ...p, status: 'expired' as const };
            }
          }
          return p;
        });
        processed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMinimartProducts(processed);
      },
      (err) => console.warn('Minimart products snapshot notice:', err)
    );

    // 4. Minimart Reports Listener (Admin-Only)
    let unsubReports = () => {};
    if (isUserAdmin) {
      unsubReports = grobaxDataService.subscribe<MinimartReport>(
        'minimartReports',
        { limit: 30 },
        (reps) => {
          const sorted = [...reps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMinimartReports(sorted);
        },
        (err) => console.warn('Minimart reports snapshot notice:', err)
      );
    }

    // 5. User Subscriptions Listener (Strictly Scoped: Only own subscription for students)
    let unsubSubs = () => {};
    if (isUserAdmin) {
      unsubSubs = grobaxDataService.subscribe<any>(
        'userSubscriptions',
        { limit: 50 },
        (subs) => {
          setUserSubscriptions(subs);
        },
        (err) => console.warn('User subscriptions snapshot notice:', err)
      );
    } else if (currentUid && currentUid !== 'user_student') {
      unsubSubs = grobaxDataService.subscribe<any>(
        'userSubscriptions',
        { where: [['userId', '==', currentUid]], limit: 5 },
        (subs) => {
          setUserSubscriptions(subs);
        },
        (err) => console.warn('User subscriptions snapshot notice:', err)
      );
    }

    // 6. Admin Subscription Plans Listener (Limit 10 + Cache)
    const unsubPlans = onSnapshot(
      query(collection(db, 'subscriptionPlans'), limit(10)),
      (snap) => {
        if (!snap.empty) {
          const loaded: SubscriptionPlan[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              planId: data.planId || docSnap.id,
              name: data.name || '',
              shortDescription: data.shortDescription || '',
              fullDescription: data.fullDescription || '',
              priceNaira: typeof data.priceNaira === 'number' ? data.priceNaira : Number(data.priceNaira || 0),
              currency: 'NGN',
              durationValue: typeof data.durationValue === 'number' ? data.durationValue : Number(data.durationValue || 30),
              durationUnit: data.durationUnit || 'Days',
              benefits: Array.isArray(data.benefits) ? data.benefits : [],
              features: Array.isArray(data.features) ? data.features : [],
              badgeLabel: data.badgeLabel || '',
              featured: Boolean(data.featured),
              active: data.active !== false,
              displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : Number(data.displayOrder || 1),
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          });
          loaded.sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
          setSubscriptionPlans(loaded);
          try {
            localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(loaded));
          } catch {}
        }
      },
      (err) => console.warn('Subscription plans snapshot notice:', err)
    );

    // 7. Authoritative Wallet Transactions (Scoped: user gets own 25, admin gets top 50)
    const txQuery = isUserAdmin
      ? query(collection(db, 'walletTransactions'), limit(50))
      : (currentUid && currentUid !== 'user_student')
      ? query(collection(db, 'walletTransactions'), where('userId', '==', currentUid), limit(25))
      : query(collection(db, 'walletTransactions'), limit(10));

    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        if (!snap.empty) {
          const loadedTxs: Transaction[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const formattedDate = data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : 'Recent');

            return {
              id: docSnap.id,
              type: data.type || 'reward',
              amount: typeof data.amount === 'number' ? data.amount : Number(data.amount || 0),
              unit: data.unit || 'GP',
              title: data.title || 'Wallet Transaction',
              description: data.description || '',
              date: formattedDate,
              status: data.status || 'completed',
              isCredit: Boolean(data.isCredit),
              transactionId: data.transactionId || docSnap.id,
              userId: data.userId || '',
              userName: data.userName || '',
              userEmail: data.userEmail || '',
              userAvatar: data.userAvatar || '',
              institutionName: data.institutionName || '',
              adminUid: data.adminUid || '',
              adminName: data.adminName || '',
              reason: data.reason || '',
              createdAt: data.createdAt,
              meta: data.meta || null,
            };
          });

          // Sort newest first
          loadedTxs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            if (timeA && timeB) return timeB - timeA;
            return 0;
          });

          setTransactions(loadedTxs);
          try {
            localStorage.setItem('grobax_saved_wallet_txs', JSON.stringify(loadedTxs));
          } catch {}
        }
      },
      (err) => {
        console.warn('Wallet transactions live snapshot notice:', err);
        try {
          const cached = localStorage.getItem('grobax_saved_wallet_txs');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setTransactions(parsed);
          }
        } catch {}
      }
    );

    // 8. One-time Sponsor Ticker Fetch (getDocs exactly once on component load, preventing Firebase read leaks)
    const spQuery = query(collection(db, 'sponsors'), limit(10));
    getDocs(spQuery)
      .then((snap) => {
        if (!snap.empty) {
          const loadedSponsors: SponsorshipCampaign[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              sponsorName: data.sponsorName || '',
              title: data.title || '',
              text: data.text || '',
              logo: data.logo || '📢',
              banner: data.banner || '',
              destinationUrl: data.destinationUrl || '',
              ctaText: data.ctaText || 'Learn More',
              tag: data.tag || '',
              badgeLabel: data.badgeLabel || 'Sponsored',
              placement: data.placement || 'Ticker',
              priority: data.priority || 'High',
              status: data.status || 'Active',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              impressions: typeof data.impressions === 'number' ? data.impressions : 0,
              clicks: typeof data.clicks === 'number' ? data.clicks : 0,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
              createdBy: data.createdBy || 'Admin',
            } as SponsorshipCampaign;
          });
          setSponsorshipCampaigns(loadedSponsors);
          try {
            localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(loadedSponsors));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('One-time sponsors getDocs notice:', err);
      });

    // 9. Authoritative Student GP Withdrawals Listener (Scoped: user gets own 15, admin gets 50)
    const wdQuery = isUserAdmin
      ? query(collection(db, 'withdrawals'), limit(50))
      : (currentUid && currentUid !== 'user_student')
      ? query(collection(db, 'withdrawals'), where('userId', '==', currentUid), limit(15))
      : query(collection(db, 'withdrawals'), limit(10));

    const unsubWithdrawals = onSnapshot(
      wdQuery,
      (snap) => {
        if (!snap.empty) {
          const loadedWds: WithdrawalRecord[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const createdAtMillis = data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (typeof data.createdAtMillis === 'number' ? data.createdAtMillis : Date.now()));
            return {
              id: docSnap.id,
              userId: data.userId || '',
              username: data.username || data.accountName || 'Scholar',
              userAvatar: data.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
              amountGP: Number(data.amountGP || 0),
              fiatValue: data.fiatValue || `₦${(Number(data.amountGP || 0) * 1).toLocaleString()}`,
              requestDate: data.requestDate || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent'),
              status: data.status || 'Pending',
              bankName: data.bankName || 'Bank',
              accountNumber: data.accountNumber || '',
              accountName: data.accountName || 'Student Account',
              reference: data.reference || docSnap.id.substring(0, 10),
              adminNotes: data.adminNotes || '',
              createdAtMillis,
            } as unknown as WithdrawalRecord;
          });
          setWithdrawals(loadedWds);
          try {
            localStorage.setItem('grobax_saved_withdrawals', JSON.stringify(loadedWds));
          } catch {}
        }
      },
      (err) => {
        console.warn('Withdrawals live snapshot notice:', err);
        try {
          const cached = localStorage.getItem('grobax_saved_withdrawals');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setWithdrawals(parsed);
          }
        } catch {}
      }
    );

    return () => {
      unsubConfig();
      unsubCategories();
      unsubProducts();
      unsubReports();
      unsubSubs();
      unsubPlans();
      unsubTx();
      unsubWithdrawals();
    };
  }, [currentUser.id, currentUser.role, firebaseUser?.uid]);

  const toggleEventRegistration = (eventId: string) => {
    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === eventId) {
          const isRegistered = !ev.isRegistered;
          return {
            ...ev,
            isRegistered,
            participantsCount: isRegistered ? ev.participantsCount + 1 : ev.participantsCount - 1,
          };
        }
        return ev;
      })
    );
  };

  const addAnnouncement = (newAnn: Omit<Announcement, 'id' | 'date'>) => {
    const item: Announcement = {
      ...newAnn,
      id: 'ann_' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
    setAnnouncements(prev => [item, ...prev]);
    saveAnnouncementToFirestore(item).catch(err => console.warn('Notice saving announcement to Firestore:', err));
  };

  const createPost = async (content: string, tags: string[], attachmentData?: string): Promise<void> => {
    const subInfo = resolveUserSubscriptionStatus(currentUser);
    const hasUpgradedPlan = subInfo.isSubscribed;
    const effectiveTier = subInfo.effectiveTier;

    const isStaffOrAdmin =
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      currentUser.name.toLowerCase().includes('admin') ||
      currentUser.name.toLowerCase().includes('staff');

    const isCommunityManager =
      currentUser.role === 'community_manager' ||
      currentUser.name.toLowerCase().includes('community manager');

    const nowMillis = Date.now();
    const newPost: Post = {
      id: 'post_' + nowMillis + '_' + Math.random().toString(36).substring(2, 6),
      author: {
        name: currentUser.name || currentUser.fullName || 'Grobax Scholar',
        username: currentUser.username || '@scholar',
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: currentUser.role || 'student',
        isRepresentative: currentUser.isRepresentative,
        institution: currentUser.institution || currentUser.institutionName || 'Grobax Scholar',
        department: currentUser.department || currentUser.departmentName,
        level: currentUser.level,
        privacy: currentUser.privacy,
        badges: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? (currentUser.badges || []) : [],
        equippedBadge: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? currentUser.equippedBadge : undefined,
        membershipTier: effectiveTier,
        subscriptionTier: effectiveTier,
        subscriptionExpiry: currentUser.subscriptionExpiry,
        isPremium: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager,
        isStaffOrAdmin,
        isCommunityManager,
        verified: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager || currentUser.verified,
      },
      content,
      image: attachmentData && (attachmentData.startsWith('http') || attachmentData.startsWith('data:')) ? attachmentData : undefined,
      timestamp: 'Just now',
      tags,
      likes: 0,
      commentsCount: 0,
      shares: 0,
      isLiked: false,
      status: 'Published',
      attachments: attachmentData ? { type: attachmentData.startsWith('http') ? 'image' : 'code', data: attachmentData } : undefined,
      createdAtMillis: nowMillis,
    } as Post;

    setPosts(prev => {
      const updated = [newPost, ...prev];
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await saveCommunityPostToFirestore(newPost);
    } catch (err) {
      console.warn('Notice saving post to Firestore:', err);
    }
  };

  const toggleLikePost = (id: string) => {
    let updatedLikes = 0;
    let nextIsLiked = false;
    setPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          nextIsLiked = !p.isLiked;
          updatedLikes = nextIsLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
          return {
            ...p,
            isLiked: nextIsLiked,
            likes: updatedLikes,
          };
        }
        return p;
      })
    );
    toggleLikeCommunityPostInFirestore(id, updatedLikes, nextIsLiked).catch(err =>
      console.warn('Notice toggling post like in Firestore:', err)
    );
  };

  const claimReward = async (amount: number, unit: 'GRBX' | 'GP', reason: string) => {
    const newGrbx = unit === 'GRBX' ? currentUser.grbxTokens + amount : currentUser.grbxTokens;
    const newGp = unit === 'GP' ? currentUser.gpBalance + amount : currentUser.gpBalance;

    setCurrentUser(prev => ({
      ...prev,
      grbxTokens: newGrbx,
      gpBalance: newGp,
    }));

    if (firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, {
          grbxTokens: newGrbx,
          gpBalance: newGp,
        });
      } catch (e) {
        console.warn('claimReward firestore sync notice:', e);
      }
    }

    addTransaction({
      type: 'reward',
      amount,
      unit,
      title: `${unit} Reward Claimed`,
      description: reason || `Claimed ${amount} ${unit} academic milestone reward`,
      isCredit: true,
      userId: firebaseUser?.uid || currentUser.id,
      userName: currentUser.name || currentUser.fullName || 'Scholar',
      userEmail: currentUser.email || currentUser.username || '',
      userAvatar: currentUser.avatar || '',
      institutionName: currentUser.institution || currentUser.institutionName || '',
      status: 'completed',
      reason,
    });
  };

  const buyBadge = async (badge: BadgeStoreItem): Promise<boolean> => {
    const currentGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
    if (currentGp < badge.gpPrice) {
      return false;
    }
    if (currentUser.purchasedBadgeIds.includes(badge.id)) {
      return false; // Already purchased
    }

    const updatedBadges = [
      ...currentUser.badges,
      {
        id: badge.id,
        title: badge.name,
        icon: badge.image,
        color: badge.color,
      },
    ];
    const updatedPurchasedIds = [...currentUser.purchasedBadgeIds, badge.id];
    const newGpBalance = Math.max(0, currentGp - badge.gpPrice);

    setCurrentUser(prev => ({
      ...prev,
      gpBalance: newGpBalance,
      purchasedBadgeIds: updatedPurchasedIds,
      badges: updatedBadges,
    }));

    const targetUid = firebaseUser?.uid || currentUser.id;
    if (targetUid) {
      try {
        await updateUserProfileInFirestore(targetUid, {
          gpBalance: newGpBalance,
          purchasedBadgeIds: updatedPurchasedIds,
          badges: updatedBadges,
        });
      } catch (e) {
        console.warn('buyBadge firestore sync notice:', e);
      }
    }

    addTransaction({
      type: 'badge_purchase',
      amount: badge.gpPrice,
      unit: 'GP',
      title: `Badge Acquired: ${badge.name}`,
      description: `Unlocked and equipped ${badge.name} badge`,
      isCredit: false,
    });

    return true;
  };

  const requestGpWithdrawal = (
    gpAmount: number,
    bankName: string,
    accountNumber: string,
    accountName?: string
  ): boolean => {
    const currentGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
    if (currentGp < gpAmount) return false;
    const rate = gpConversionConfig.gpToFiatRate || 1;
    const fiatNumber = gpAmount * rate;
    const fiatVal = `₦${fiatNumber.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NGN`;
    const newGpBalance = Math.max(0, currentGp - gpAmount);

    setCurrentUser(prev => ({
      ...prev,
      gpBalance: newGpBalance,
    }));

    const targetUid = firebaseUser?.uid || currentUser.id || 'scholar';

    const newRecord: WithdrawalRecord = {
      id: 'w_' + Date.now(),
      userId: targetUid,
      username: currentUser.name || currentUser.fullName || 'Scholar',
      userAvatar: currentUser.avatar,
      amountGP: gpAmount,
      fiatValue: fiatVal,
      requestDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: 'Pending',
      bankName,
      accountNumber,
      accountName: accountName || currentUser.name || 'Scholar',
      reference: 'TX-WD-' + Math.floor(100000 + Math.random() * 900000),
    };

    setWithdrawals(prev => [newRecord, ...prev]);

    submitWithdrawalRequestInFirestore(newRecord).catch(e => {
      console.warn('Firestore withdrawal request submission notice:', e);
    });

    if (targetUid) {
      try {
        deductUserGpInFirestore(targetUid, gpAmount, {
          type: 'withdrawal',
          title: 'GP Cash Out Request',
          description: `Cash out request of ${gpAmount.toLocaleString()} GP (${fiatVal}) to ${bankName} (${accountNumber})`,
          skipTransactionDoc: true, // addTransaction handles recording below
        }).catch(e => console.warn('requestGpWithdrawal user balance sync notice:', e));
      } catch (e) {
        console.warn('requestGpWithdrawal firestore sync notice:', e);
      }
    }

    addTransaction({
      type: 'gp_withdrawal',
      amount: gpAmount,
      unit: 'GP',
      title: 'GP Cash Out Request',
      description: `Converted ${gpAmount.toLocaleString()} GP to ${fiatVal} payout (${bankName} - ${accountNumber})`,
      isCredit: false,
    });

    if (targetUid) {
      sendNotification({
        title: '💸 Withdrawal Request Submitted',
        message: `Your cash out request of ${gpAmount.toLocaleString()} GP (${fiatVal}) to ${bankName} (${accountNumber}) has been submitted for processing.`,
        type: 'wallet',
        targetUserId: targetUid,
        userId: targetUid,
        actionUrl: '#wallet',
      });
    }

    return true;
  };

  const updatePrivacy = async (newPrivacy: Partial<PrivacySettings>) => {
    const updatedPrivacy = {
      ...currentUser.privacy,
      ...newPrivacy,
    };
    setCurrentUser(prev => ({
      ...prev,
      privacy: updatedPrivacy,
    }));

    if (firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, {
          privacy: updatedPrivacy,
        });
      } catch (e) {
        console.warn('updatePrivacy firestore sync notice:', e);
      }
    }
  };

  const addMasterInstitution = (inst: Omit<MasterInstitution, 'id' | 'activeInSeason' | 'hidden'>) => {
    const newInst: MasterInstitution = {
      ...inst,
      id: 'inst_' + Date.now(),
      activeInSeason: true,
      hidden: false,
    };
    setMasterInstitutions(prev => [...prev, newInst]);
  };

  const updateMasterInstitution = (id: string, data: Partial<MasterInstitution>) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, ...data } : i))
    );
  };

  const addDepartmentToInstitution = (instId: string, departmentName: string) => {
    setMasterInstitutions(prev =>
      prev.map(inst => {
        if (inst.id === instId && !inst.departments.includes(departmentName)) {
          return { ...inst, departments: [...inst.departments, departmentName] };
        }
        return inst;
      })
    );
  };

  const removeDepartmentFromInstitution = (instId: string, departmentName: string) => {
    setMasterInstitutions(prev =>
      prev.map(inst => {
        if (inst.id === instId) {
          return { ...inst, departments: inst.departments.filter(d => d !== departmentName) };
        }
        return inst;
      })
    );
  };

  const toggleInstitutionSeason = (id: string) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, activeInSeason: !i.activeInSeason } : i))
    );
  };

  const toggleInstitutionHidden = (id: string) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, hidden: !i.hidden } : i))
    );
  };

  // Seasons Manager
  const addSeason = (season: Omit<LeagueSeason, 'id'>) => {
    const newSeason: LeagueSeason = {
      ...season,
      id: 'sea_' + Date.now(),
    };
    setSeasons(prev => [...prev, newSeason]);
  };

  const updateSeasonStatus = (seasonId: string, status: LeagueSeason['status']) => {
    setSeasons(prev =>
      prev.map(s => (s.id === seasonId ? { ...s, status } : s))
    );
  };

  const toggleSeasonParticipation = (seasonId: string, instId: string) => {
    setSeasons(prev =>
      prev.map(s => {
        if (s.id === seasonId) {
          const currentList = s.participatingInstitutionIds || [];
          const exists = currentList.includes(instId);
          return {
            ...s,
            participatingInstitutionIds: exists
              ? currentList.filter(id => id !== instId)
              : [...currentList, instId],
          };
        }
        return s;
      })
    );
  };

  // Question Set Manager
  const addQuestionSet = (qSet: Omit<QuestionSet, 'id'>) => {
    const newSet: QuestionSet = {
      ...qSet,
      id: 'qset_' + Date.now(),
    };
    setQuestionSets(prev => [...prev, newSet]);
  };

  const addQuestionToSet = (qSetId: string, question: Omit<QuestionItem, 'id'>) => {
    const newQuestion: QuestionItem = {
      ...question,
      id: 'q_' + Date.now(),
    };
    setQuestionSets(prev =>
      prev.map(qs => (qs.id === qSetId ? { ...qs, questions: [...qs.questions, newQuestion] } : qs))
    );
  };

  // Qualifications & Representatives
  const addQualificationCompetition = (qual: Omit<QualificationCompetition, 'id'>) => {
    const newQual: QualificationCompetition = {
      ...qual,
      id: 'qual_' + Date.now(),
    };
    setQualificationCompetitions(prev => [...prev, newQual]);
  };

  const assignRepresentative = async (studentData: {
    studentId: string;
    studentName: string;
    studentUsername?: string;
    avatar?: string;
    institutionId: string;
    institutionName?: string;
    department?: string;
    level?: string;
    seasonId?: string;
    score?: number;
  }) => {
    try {
      await assignRepresentativeInFirestore(
        {
          userId: studentData.studentId,
          userName: studentData.studentName,
          userUsername: studentData.studentUsername,
          userAvatar: studentData.avatar,
          institutionId: studentData.institutionId,
          institutionName: studentData.institutionName,
          department: studentData.department,
          level: studentData.level,
          seasonId: studentData.seasonId || 'sea_univ_1',
          qualificationScore: studentData.score || 100,
          status: 'active',
        },
        currentUser?.id || 'admin_sys',
        currentUser?.name || 'Super Admin'
      );

      if (currentUser?.id === studentData.studentId || currentUser?.name === studentData.studentName) {
        setCurrentUser((prev) => ({ ...prev, isRepresentative: true, role: prev.role === 'student' ? 'representative' : prev.role }));
      }
    } catch (err) {
      console.error('Failed to assign central representative in AppContext:', err);
    }
  };

  const removeRepresentative = async (repIdOrInstId: string) => {
    try {
      await removeRepresentativeInFirestore(
        repIdOrInstId,
        currentUser?.id || 'admin_sys',
        currentUser?.name || 'Super Admin'
      );
    } catch (err) {
      console.error('Failed to remove representative in AppContext:', err);
    }
  };

  const updateFixtureScore = (id: string, homeScore: number, awayScore: number, status: 'Live' | 'Upcoming' | 'Completed') => {
    setFixtures(prev =>
      prev.map(f => (f.id === id ? { ...f, homeScore, awayScore, status } : f))
    );
  };

  const addFixture = (fix: Omit<LeagueFixture, 'id'>) => {
    const newFix: LeagueFixture = {
      ...fix,
      id: 'fix_' + Date.now(),
    };
    setFixtures(prev => [newFix, ...prev]);
  };

  const updateFixtureState = (id: string, patch: Partial<LeagueFixture>) => {
    setFixtures(prev =>
      prev.map(f => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  // Dynamic Standings Calculation from Master Institutions and Fixtures
  const calculateStandings = (category: InstitutionCategory, seasonId?: string): InstitutionRank[] => {
    const insts = masterInstitutions.filter(i => i.type === category && !i.hidden);
    
    // Relevant completed fixtures
    const completedFixes = fixtures.filter(f => {
      const matchCat = f.category === category;
      const matchCompleted = f.status === 'Completed';
      const matchSeason = seasonId ? f.seasonId === seasonId : true;
      return matchCat && matchCompleted && matchSeason;
    });

    const statsMap: Record<string, { played: number; won: number; lost: number; points: number; scored: number; conceded: number }> = {};

    insts.forEach(inst => {
      statsMap[inst.name] = { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      // Also map by shortName
      statsMap[inst.shortName] = statsMap[inst.name];
    });

    completedFixes.forEach(fix => {
      const homeStats = statsMap[fix.homeInst] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      const awayStats = statsMap[fix.awayInst] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };

      homeStats.played += 1;
      awayStats.played += 1;

      homeStats.scored += fix.homeScore;
      homeStats.conceded += fix.awayScore;

      awayStats.scored += fix.awayScore;
      awayStats.conceded += fix.homeScore;

      if (fix.homeScore > fix.awayScore) {
        homeStats.won += 1;
        homeStats.points += 3;
        awayStats.lost += 1;
      } else if (fix.awayScore > fix.homeScore) {
        awayStats.won += 1;
        awayStats.points += 3;
        homeStats.lost += 1;
      } else {
        homeStats.points += 1;
        awayStats.points += 1;
      }

      statsMap[fix.homeInst] = homeStats;
      statsMap[fix.awayInst] = awayStats;
    });

    const list: InstitutionRank[] = insts.map(inst => {
      const st = statsMap[inst.name] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      const repRecord = representativeRecords.find(r => r.institutionId === inst.id);

      return {
        id: inst.id,
        rank: 0,
        name: inst.name,
        shortName: inst.shortName,
        logo: inst.logo,
        type: inst.type,
        played: st.played,
        won: st.won,
        lost: st.lost,
        points: st.points,
        scoreDiff: st.scored - st.conceded,
        goldMedals: st.won * 2,
        silverMedals: st.lost,
        bronzeMedals: 1,
        representative: repRecord ? repRecord.studentName : 'Official Delegate',
        trend: 'same',
        region: inst.state,
        scholarsCount: 150 + st.points * 10,
      };
    });

    // Sort by Points DESC, then scoreDiff DESC, then played ASC
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return a.played - b.played;
    });

    // Assign rank positions
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  };

  const triggerAiBroadcast = (content: string) => {
    const aiPost: Post = {
      id: 'ai_post_' + Date.now(),
      author: {
        name: 'GRBX AI Academic Sentinel',
        username: '@grbx_ai_sentinel',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        institution: 'GRBX Central Intelligence',
        verified: true,
      },
      content: `🤖 AUTOMATED BROADCAST: ${content}`,
      timestamp: 'Just now',
      tags: ['AIBroadcast', 'LeagueNotice', 'Automated'],
      likes: 0,
      commentsCount: 0,
      shares: 0,
      isLiked: false,
      isAiGenerated: true,
    };
    setPosts(prev => [aiPost, ...prev]);
  };

  // =========================================================================
  // GROBAX MINIMART HANDLERS
  // =========================================================================

  const checkUserListingEligibility = (targetUserId?: string): UserListingEligibility => {
    const uid = targetUserId || currentUser.id;
    const isTargetCurrentUser = uid === currentUser.id;
    const userRole = isTargetCurrentUser ? (currentUser.role || 'student').toLowerCase() : 'student';

    // 1. Staff and Admins always get VIP listing capabilities
    if (
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'community_manager' ||
      userRole === 'staff' ||
      currentUser.name?.toLowerCase().includes('admin')
    ) {
      const todayListings = minimartProducts.filter(p => {
        if (p.sellerId !== uid) return false;
        if (p.status === 'removed' || p.status === 'archived') return false;
        const createdTime = new Date(p.createdAt).getTime();
        return createdTime >= Date.now() - 24 * 60 * 60 * 1000;
      });
      const count = todayListings.length;
      const limit = minimartConfig.vipDailyListingLimit || 6;
      const remaining = Math.max(0, limit - count);
      return {
        userId: uid,
        todayCount: count,
        dailyLimit: limit,
        remainingToday: remaining,
        userTier: 'vip',
        canCreateProduct: remaining > 0 && minimartConfig.enabled,
        listingDurationHours: minimartConfig.vipListingDurationHours || 12,
        reason: remaining <= 0 ? `VIP daily listing limit reached (${count}/${limit}). You can list another product tomorrow.` : undefined,
      };
    }

    // 2. Evaluate Subscription Tier & Status for standard users
    let tier: 'free' | 'premium' | 'vip' = 'free';

    // Check expiration if present
    const isTargetUserExpired = isTargetCurrentUser && currentUser.subscriptionExpiry
      ? new Date(currentUser.subscriptionExpiry).getTime() <= Date.now()
      : false;

    if (!isTargetUserExpired) {
      // Check userSubscriptions collection
      const activeSub = userSubscriptions.find(
        s => (s.userId === uid || (isTargetCurrentUser && s.userId === currentUser.id)) && s.status === 'active'
      );

      if (activeSub) {
        const pName = (activeSub.planNameSnapshot || '').toLowerCase();
        const pId = (activeSub.planId || '').toLowerCase();
        if (pName.includes('vip') || pName.includes('titan') || pName.includes('annual') || pId.includes('vip') || pId.includes('titan')) {
          tier = 'vip';
        } else {
          tier = 'premium';
        }
      } else if (isTargetCurrentUser) {
        const membership = (currentUser.membershipTier || '').toLowerCase();
        const subTier = (currentUser.subscriptionTier || '').toLowerCase();
        const planStr = ((currentUser.subscriptionPlan || (currentUser as any).planId || (currentUser as any).tier || currentUser.activePlanId || '') + '').toLowerCase();
        const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);

        const isVipTier =
          membership.includes('vip') ||
          membership.includes('titan') ||
          subTier.includes('vip') ||
          subTier.includes('titan') ||
          planStr.includes('vip') ||
          planStr.includes('titan') ||
          planStr.includes('annual');

        if (isVipTier) {
          tier = 'vip';
        } else if (
          isActivelySubscribed ||
          currentUser.isPremium ||
          (currentUser.activePlanId && !currentUser.activePlanId.toLowerCase().includes('free')) ||
          (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
          (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
          (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.trim().length > 0)
        ) {
          tier = 'premium';
        }
      }
    }

    // 3. Free Users cannot create or publish listings
    if (tier === 'free') {
      return {
        userId: uid,
        todayCount: 0,
        dailyLimit: 0,
        remainingToday: 0,
        userTier: 'free',
        canCreateProduct: false,
        listingDurationHours: 0,
        reason: 'Selling on Grobax Minimart is exclusive to Premium (3/day, 12hrs) and VIP (6/day, 12hrs) subscribers. Free accounts are discovery-only.',
      };
    }

    // 4. Premium & VIP limits calculation
    const limit = tier === 'vip' ? (minimartConfig.vipDailyListingLimit || 6) : (minimartConfig.premiumDailyListingLimit || 3);
    const durationHours = tier === 'vip' ? (minimartConfig.vipListingDurationHours || 12) : (minimartConfig.premiumListingDurationHours || 12);

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const todayListings = minimartProducts.filter(p => {
      if (p.sellerId !== uid) return false;
      if (p.status === 'removed' || p.status === 'archived') return false;
      const createdTime = new Date(p.createdAt).getTime();
      return createdTime >= oneDayAgo;
    });

    const count = todayListings.length;
    const remaining = Math.max(0, limit - count);
    const canCreate = remaining > 0 && minimartConfig.enabled;

    let reason: string | undefined;
    if (!minimartConfig.enabled) {
      reason = 'Minimart listings are temporarily paused by administrators.';
    } else if (remaining <= 0) {
      reason = `${tier.toUpperCase()} daily limit reached (${count}/${limit}). You can list another product tomorrow.`;
    }

    return {
      userId: uid,
      todayCount: count,
      dailyLimit: limit,
      remainingToday: remaining,
      userTier: tier,
      canCreateProduct: canCreate,
      listingDurationHours: durationHours,
      reason,
    };
  };

  const addMinimartProduct = async (
    productData: Omit<MinimartProduct, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'reportsCount' | 'viewsCount'>
  ): Promise<{ success: boolean; error?: string; product?: MinimartProduct }> => {
    try {
      const eligibility = checkUserListingEligibility(productData.sellerId);
      if (!eligibility.canCreateProduct) {
        return {
          success: false,
          error: eligibility.reason || 'You are not eligible to list products at this time.',
        };
      }

      const now = Date.now();
      const durationHours = eligibility.listingDurationHours || 12;
      const expiresAt = new Date(now + durationHours * 60 * 60 * 1000).toISOString();
      const generatedId = `prod_${now}_${Math.random().toString(36).substring(2, 6)}`;

      const newProduct: MinimartProduct = {
        ...productData,
        id: generatedId,
        productId: generatedId,
        status: 'active',
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        expiresAt,
        subscriptionPlan: eligibility.userTier,
        listingDurationHours: durationHours,
        reportsCount: 0,
        viewsCount: 0,
      };

      // 1. Optimistic Local State Update
      setMinimartProducts(prev => [newProduct, ...prev]);

      // 2. Persist to Firestore
      await saveMinimartProductToFirestore(newProduct);

      // 3. Sync with backend API
      try {
        await fetch('/api/minimart/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newProduct,
            userRole: currentUser.role,
          }),
        });
      } catch (apiErr) {
        console.warn('Minimart backend API sync notice:', apiErr);
      }

      return { success: true, product: newProduct };
    } catch (err: any) {
      console.error('Error adding Minimart product:', err);
      return { success: false, error: err.message || 'Failed to list product.' };
    }
  };

  const updateMinimartProduct = async (
    productId: string,
    updates: Partial<MinimartProduct>
  ): Promise<{ success: boolean; error?: string; product?: MinimartProduct }> => {
    try {
      let updatedProduct: MinimartProduct | undefined;

      setMinimartProducts(prev =>
        prev.map(p => {
          if (p.id === productId || p.productId === productId) {
            updatedProduct = {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return updatedProduct;
          }
          return p;
        })
      );

      if (updatedProduct) {
        await saveMinimartProductToFirestore(updatedProduct);

        try {
          await fetch(`/api/minimart/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updates,
              userId: currentUser.id,
              userRole: currentUser.role,
            }),
          });
        } catch (apiErr) {
          console.warn('Minimart update backend sync notice:', apiErr);
        }
      }

      return { success: true, product: updatedProduct };
    } catch (err: any) {
      console.error('Error updating Minimart product:', err);
      return { success: false, error: err.message || 'Failed to update product.' };
    }
  };

  const deleteMinimartProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Record in local deleted set for persistence across fallback/reloads
      try {
        const deletedArr: string[] = JSON.parse(localStorage.getItem('grobax_deleted_minimart_products') || '[]');
        if (!deletedArr.includes(productId)) {
          deletedArr.push(productId);
          localStorage.setItem('grobax_deleted_minimart_products', JSON.stringify(deletedArr));
        }
      } catch {}

      // Immediately purge from UI state
      setMinimartProducts(prev => prev.filter(p => p.id !== productId && p.productId !== productId));
      setMinimartReports(prev => prev.filter(r => r.productId !== productId));

      await deleteMinimartProductFromFirestore(productId);

      try {
        await fetch(`/api/minimart/products/${productId}?userId=${currentUser.id}&userRole=${currentUser.role}`, {
          method: 'DELETE',
        });
      } catch (apiErr) {
        console.warn('Minimart delete backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting Minimart product:', err);
      return { success: false, error: err.message || 'Failed to delete product.' };
    }
  };

  const reportMinimartProduct = async (
    productId: string,
    reason: MinimartReportReason,
    description: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const product = minimartProducts.find(p => p.id === productId || p.productId === productId);
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newReport: MinimartReport = {
        id: reportId,
        reportId,
        productId,
        productName: product?.productName || 'Minimart Listing',
        sellerId: product?.sellerId,
        sellerName: product?.sellerName,
        reportedBy: currentUser.id,
        reporterName: currentUser.name,
        reason,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setMinimartReports(prev => [newReport, ...prev]);
      await submitMinimartReportToFirestore(newReport);

      try {
        await fetch(`/api/minimart/products/${productId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReport),
        });
      } catch (apiErr) {
        console.warn('Minimart report backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error submitting report:', err);
      return { success: false, error: err.message || 'Failed to submit report.' };
    }
  };

  const updateMinimartProductStatus = async (
    productId: string,
    status: MinimartProductStatus
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartProducts(prev =>
        prev.map(p => (p.id === productId || p.productId === productId ? { ...p, status, updatedAt: new Date().toISOString() } : p))
      );

      await updateMinimartProductStatusInFirestore(productId, status);

      try {
        await fetch('/api/minimart/admin/moderate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, status }),
        });
      } catch (apiErr) {
        console.warn('Minimart moderate backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating product status:', err);
      return { success: false, error: err.message || 'Failed to update status.' };
    }
  };

  const saveMinimartCategory = async (category: MinimartCategory): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartCategories(prev => {
        const idx = prev.findIndex(c => c.id === category.id || c.categoryId === category.categoryId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = category;
          return clone;
        }
        return [...prev, category];
      });

      await saveMinimartCategoryToFirestore(category);

      try {
        await fetch('/api/minimart/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(category),
        });
      } catch (apiErr) {
        console.warn('Minimart save category backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving category:', err);
      return { success: false, error: err.message || 'Failed to save category.' };
    }
  };

  const deleteMinimartCategory = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartCategories(prev => prev.filter(c => c.id !== categoryId && c.categoryId !== categoryId));
      await deleteMinimartCategoryFromFirestore(categoryId);

      try {
        await fetch(`/api/minimart/categories/${categoryId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Minimart delete category backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting category:', err);
      return { success: false, error: err.message || 'Failed to delete category.' };
    }
  };

  const saveMinimartConfig = async (configUpdates: Partial<MinimartConfig>): Promise<{ success: boolean; error?: string }> => {
    try {
      const merged = { ...minimartConfig, ...configUpdates };
      setMinimartConfig(merged);
      await saveMinimartConfigToFirestore(merged);

      try {
        await fetch('/api/minimart/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
      } catch (apiErr) {
        console.warn('Minimart save config backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving Minimart config:', err);
      return { success: false, error: err.message || 'Failed to update config.' };
    }
  };

  const moderateMinimartReport = async (
    reportId: string,
    action: 'dismiss' | 'resolve' | 'suspend_product',
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartReports(prev =>
        prev.map(r => {
          if (r.id === reportId || r.reportId === reportId) {
            return {
              ...r,
              status: action === 'dismiss' ? ('dismissed' as const) : ('resolved' as const),
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser.name,
              adminNotes,
            };
          }
          return r;
        })
      );

      await moderateMinimartReportInFirestore(reportId, action, adminNotes, currentUser.id);

      if (action === 'suspend_product') {
        const rep = minimartReports.find(r => r.id === reportId || r.reportId === reportId);
        if (rep?.productId) {
          updateMinimartProductStatus(rep.productId, 'suspended');
        }
      }

      try {
        await fetch(`/api/minimart/admin/reports/${reportId}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, adminNotes, adminId: currentUser.id }),
        });
      } catch (apiErr) {
        console.warn('Minimart moderate report backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error moderating report:', err);
      return { success: false, error: err.message || 'Failed to moderate report.' };
    }
  };

  const updateAnnouncement = (id: string, patch: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    deleteAnnouncementFromFirestore(id).catch(err => console.warn('Notice removing announcement from Firestore:', err));
  };

  const publishAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Published', publishDate: new Date().toISOString().split('T')[0] } : a));
  };

  const scheduleAnnouncement = (id: string, scheduleDate: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Scheduled', scheduleDate } : a));
  };

  const unpublishAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Draft' } : a));
  };

  const pinAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
  };

  const hidePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'Hidden' } : p));
  };

  const deletePost = (postId: string) => {
    const postToDelete = posts.find(p => p.id === postId);
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteCommunityPostFromFirestore(
      postId,
      postToDelete?.content,
      currentUser?.id || 'admin_user',
      currentUser?.name || 'Administrator'
    ).catch(err => console.warn('Notice removing community post from Firestore:', err));
  };

  const updatePost = async (postId: string, content: string, tags: string[], image?: string) => {
    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            content,
            tags,
            image: image !== undefined ? image : p.image,
            attachments: image ? { type: 'image', data: image } : p.attachments,
          };
        }
        return p;
      });
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await updateCommunityPostInFirestore(postId, {
        content,
        tags,
        image: image !== undefined ? image : '',
        attachments: image ? { type: 'image', data: image } : undefined,
      });
    } catch (err) {
      console.warn('Notice updating community post in Firestore:', err);
    }
  };

  const deletePlatformEvent = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId || e.eventId === eventId);
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId && e.eventId !== eventId);
      try {
        localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await deletePlatformEventFromFirestore(
        eventId,
        ev?.title || 'Platform Event',
        ev?.imageStoragePath,
        currentUser?.id || 'admin_user',
        currentUser?.name || 'Administrator'
      );
    } catch (err) {
      console.warn('Notice deleting platform event from Firestore:', err);
    }
  };

  const restorePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'Published' } : p));
  };

  const reportPost = (postId: string, reason: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reports = p.reports || [];
      const newReport: PostReport = {
        id: 'rep_' + Date.now(),
        postId,
        reportedBy: currentUser.username,
        reason,
        timestamp: 'Just now',
        status: 'Pending',
      };
      return { ...p, reports: [...reports, newReport] };
    }));
  };

  const addCommentToPost = (
    postId: string,
    content: string,
    parentId?: string | null,
    replyTo?: { name: string; username: string; commentId: string } | null
  ) => {
    if (!content || !content.trim()) return;

    const subInfo = resolveUserSubscriptionStatus(currentUser);
    const hasUpgradedPlan = subInfo.isSubscribed;
    const effectiveTier = subInfo.effectiveTier;

    const isStaffOrAdmin =
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      currentUser.name.toLowerCase().includes('admin') ||
      currentUser.name.toLowerCase().includes('staff');

    const isCommunityManager =
      currentUser.role === 'community_manager' ||
      currentUser.name.toLowerCase().includes('community manager');

    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      const newComment: PostComment = {
        id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        postId,
        parentId: parentId || null,
        replyTo: replyTo || null,
        author: {
          name: currentUser.name,
          username: currentUser.username,
          avatar: currentUser.avatar,
          role: currentUser.role,
          institution: currentUser.institution || 'Grobax Scholar',
          department: currentUser.department,
          equippedBadge: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? currentUser.equippedBadge : undefined,
          membershipTier: effectiveTier,
          subscriptionTier: effectiveTier,
          isPremium: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager,
          isStaffOrAdmin,
          isCommunityManager,
          verified: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager || currentUser.verified,
        },
        content: content.trim(),
        timestamp: 'Just now',
        createdAtMillis: Date.now(),
        likes: 0,
        isLiked: false,
        likedBy: [],
        replies: [],
        repliesCount: 0,
      };
      updatedCommentsList = [...comments, newComment];
      return {
        ...p,
        commentsCount: (p.commentsCount || 0) + 1,
        commentsList: updatedCommentsList,
      };
    }));
    if (updatedCommentsList.length > 0) {
      addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
        console.warn('Notice syncing comment to Firestore:', err)
      );
    }
  };

  const toggleLikeComment = (postId: string, commentId: string) => {
    const userUid = currentUser.id || currentUser.username || 'user';
    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      updatedCommentsList = comments.map(c => {
        if (c.id === commentId) {
          const likedBy = c.likedBy || [];
          const isCurrentlyLiked = c.isLiked || likedBy.includes(userUid);
          const newLikedBy = isCurrentlyLiked ? likedBy.filter(uid => uid !== userUid) : [...likedBy, userUid];
          const newLikes = isCurrentlyLiked ? Math.max(0, (c.likes || 1) - 1) : (c.likes || 0) + 1;
          return {
            ...c,
            likes: newLikes,
            isLiked: !isCurrentlyLiked,
            likedBy: newLikedBy,
          };
        }
        return c;
      });
      return {
        ...p,
        commentsList: updatedCommentsList,
      };
    }));
    if (updatedCommentsList.length > 0) {
      addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
        console.warn('Notice updating comment likes in Firestore:', err)
      );
    }
  };

  const deleteComment = (postId: string, commentId: string) => {
    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      // Remove comment and any replies attached to it
      updatedCommentsList = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
      return {
        ...p,
        commentsCount: updatedCommentsList.length,
        commentsList: updatedCommentsList,
      };
    }));
    addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
      console.warn('Notice deleting comment in Firestore:', err)
    );
  };

  const suspendUserPosting = (userId: string) => {
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, isPostingSuspended: true }));
    }
  };

  const sendChatroomMessage = async (message: ChatroomLiveMessage): Promise<void> => {
    setChatroomMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      const updated = exists ? prev.map(m => m.id === message.id ? message : m) : [...prev, message];
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await sendChatroomMessageToFirestore(message);
    } catch (err) {
      console.warn('Notice syncing chatroom message to Firestore:', err);
    }
  };

  const deleteChatroomMessage = async (messageId: string): Promise<void> => {
    setChatroomMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? { ...m, isDeleted: true } : m);
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteChatroomMessageFromFirestore(messageId);
    } catch (err) {
      console.warn('Notice deleting chatroom message in Firestore:', err);
    }
  };

  const reactChatroomMessage = async (messageId: string, emoji: string): Promise<void> => {
    // Instant optimistic update for silky-smooth repeated clicking
    setChatroomMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (Number(reactions[emoji]) || 0) + 1;
        return { ...m, reactions };
      })
    );

    try {
      await reactChatroomMessageInFirestore(messageId, emoji);
    } catch (err) {
      console.warn('Notice reacting to chatroom message in Firestore:', err);
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'date' | 'status' | 'transactionId'> & Partial<Transaction>) => {
    const txId = tx.transactionId || 'TX-GRBX-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = tx.date || new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: dateStr,
      status: tx.status || 'completed',
      transactionId: txId,
      userId: tx.userId || currentUser.id || firebaseUser?.uid || '',
      userName: tx.userName || currentUser.name || currentUser.fullName || 'Scholar',
      userEmail: tx.userEmail || currentUser.email || currentUser.username || '',
      userAvatar: tx.userAvatar || currentUser.avatar || '',
      institutionName: tx.institutionName || currentUser.institution || currentUser.institutionName || '',
    };
    setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id && t.transactionId !== newTx.transactionId)]);

    // Write authoritative record to Firestore
    recordWalletTransactionInFirestore({
      userId: newTx.userId || '',
      userName: newTx.userName,
      userEmail: newTx.userEmail,
      userAvatar: newTx.userAvatar,
      institutionName: newTx.institutionName,
      type: newTx.type,
      amount: newTx.amount,
      unit: newTx.unit || 'GP',
      title: newTx.title,
      description: newTx.description,
      isCredit: newTx.isCredit,
      status: newTx.status,
      transactionId: newTx.transactionId,
      adminUid: newTx.adminUid,
      adminName: newTx.adminName,
      reason: newTx.reason,
      meta: newTx.meta,
    }).catch(err => console.warn('Could not record wallet transaction in Firestore:', err));
  };

  const updateGpConversionConfig = (config: Partial<GpConversionConfig>) => {
    setGpConversionConfig(prev => ({ ...prev, ...config }));
    saveGpConversionConfigToFirestore(config, firebaseUser?.uid, currentUser.name).catch(err => {
      console.warn('Could not sync GP conversion config to Firestore:', err);
    });
  };

  const updateWithdrawalStatus = (id: string, status: WithdrawalRecord['status'], notes?: string) => {
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status, adminNotes: notes || w.adminNotes } : w));
  };

  const adminAdjustGpBalance = async (amount: number, reason: string) => {
    const targetUid = firebaseUser?.uid || currentUser.id;
    if (targetUid) {
      try {
        const res = await adjustUserGpInFirestore(targetUid, amount, reason, targetUid, currentUser.name);
        if (res.success) {
          setCurrentUser(prev => ({ ...prev, gpBalance: res.newBalance }));
        }
      } catch (e) {
        console.warn('adminAdjustGpBalance firestore sync notice:', e);
      }
    } else {
      const newBalance = Math.max(0, (currentUser.gpBalance || 0) + amount);
      setCurrentUser(prev => ({ ...prev, gpBalance: newBalance }));
    }
  };

  const adminAdjustTargetUserGp = async (targetUserId: string, amount: number, reason: string) => {
    if (!targetUserId) return;
    try {
      await adjustUserGpInFirestore(targetUserId, amount, reason, firebaseUser?.uid || currentUser.id, currentUser.name);
    } catch (e) {
      console.warn('adminAdjustTargetUserGp firestore error:', e);
    }
  };

  const addBadgeToStore = (badge: Omit<BadgeStoreItem, 'id'>) => {
    const newBadge: BadgeStoreItem = {
      ...badge,
      id: 'b_' + Date.now(),
      createdDate: new Date().toISOString().split('T')[0],
      purchasesCount: 0,
    };
    setBadgeStore(prev => [newBadge, ...prev]);
  };

  const updateBadgeInStore = (id: string, patch: Partial<BadgeStoreItem>) => {
    setBadgeStore(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const equipBadge = async (badgeId: string) => {
    const badgeItem = badgeStore.find(b => b.id === badgeId) || currentUser.badges.find(b => b.id === badgeId);
    if (!badgeItem) {
      setCurrentUser(prev => ({ ...prev, equippedBadgeId: undefined, equippedBadge: undefined }));
      if (firebaseUser) {
        try {
          await updateUserProfileInFirestore(firebaseUser.uid, {
            equippedBadgeId: undefined,
            equippedBadge: undefined,
          } as any);
        } catch (e) {
          console.warn('equipBadge unset notice:', e);
        }
      }
      return;
    }
    const equippedBadgeObj = {
      id: badgeItem.id,
      title: 'name' in badgeItem ? badgeItem.name : badgeItem.title,
      icon: 'image' in badgeItem ? badgeItem.image : badgeItem.icon,
      color: badgeItem.color || 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    setCurrentUser(prev => ({
      ...prev,
      equippedBadgeId: badgeId,
      equippedBadge: equippedBadgeObj,
    }));
    if (firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, {
          equippedBadgeId: badgeId,
          equippedBadge: equippedBadgeObj,
        });
      } catch (e) {
        console.warn('equipBadge sync notice:', e);
      }
    }
  };

  const addSponsorshipCampaign = async (campaign: Omit<SponsorshipCampaign, 'id'>) => {
    const newCamp: SponsorshipCampaign = {
      ...campaign,
      id: 'sp_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Admin',
    };
    setSponsorshipCampaigns(prev => {
      const updated = [newCamp, ...prev];
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await saveSponsorshipCampaignToFirestore(
        newCamp,
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.warn('Error saving sponsorship campaign to Firestore:', err);
    }
  };

  const updateSponsorshipCampaign = async (id: string, patch: Partial<SponsorshipCampaign>) => {
    let updatedCampaign: SponsorshipCampaign | undefined;
    setSponsorshipCampaigns(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          updatedCampaign = { ...s, ...patch, updatedAt: new Date().toISOString() };
          return updatedCampaign;
        }
        return s;
      });
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (updatedCampaign) {
      try {
        await saveSponsorshipCampaignToFirestore(
          updatedCampaign,
          firebaseUser?.uid || currentUser.id,
          currentUser.name
        );
      } catch (err) {
        console.warn('Error updating sponsorship campaign in Firestore:', err);
      }
    }
  };

  const deleteSponsorshipCampaign = async (id: string) => {
    const existing = sponsorshipCampaigns.find(s => s.id === id);
    setSponsorshipCampaigns(prev => {
      const updated = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await deleteSponsorshipCampaignFromFirestore(
        id,
        existing?.title || 'Sponsorship Campaign',
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.warn('Error deleting sponsorship campaign from Firestore:', err);
    }
  };

  const updateUpgradePlan = (id: string, patch: Partial<UpgradePlan>) => {
    setUpgradePlans(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const markNotificationRead = (id: string) => {
    // Persist to local storage scoped by current user
    try {
      const currentUid = firebaseUser?.uid || currentUser.id;
      const storageKey = `grobax_read_notifs_${currentUid}`;
      const stored = localStorage.getItem(storageKey);
      const readIds: string[] = stored ? JSON.parse(stored) : [];
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(storageKey, JSON.stringify(readIds));
        localStorage.setItem('grobax_read_notifs', JSON.stringify(readIds));
      }
    } catch (e) {
      console.warn('Failed to save read notif ID to local storage:', e);
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const sendNotification = async (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => {
    const currentUid = firebaseUser?.uid || currentUser.id;
    const resolvedTargetUid = notif.targetUserId || notif.userId || (notif.type === 'system' || notif.type === 'wallet' ? currentUid : undefined);
    const newNotif: NotificationItem = {
      ...notif,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: 'Just now',
      isRead: false,
      createdAtMs: Date.now(),
      targetUserId: resolvedTargetUid,
      userId: resolvedTargetUid,
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Also persist targeted or broadcast notification to Firestore
    try {
      await sendBroadcastNotificationToFirestore(
        {
          title: notif.title,
          message: notif.message,
          type: notif.type,
          targetRole: notif.targetRole,
          userId: resolvedTargetUid,
          targetUserId: resolvedTargetUid,
          excludeUserId: notif.excludeUserId,
          actionUrl: notif.actionUrl,
        },
        currentUid,
        currentUser.name
      );
    } catch (err) {
      console.warn('sendNotification firestore notice:', err);
    }
  };

  const updateSystemSettings = async (settingsPatch: Partial<SystemSettings>) => {
    setSystemSettings(prev => ({ ...prev, ...settingsPatch }));
    try {
      await saveSystemSettingsToFirestore(
        settingsPatch,
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.error('Failed to update system settings in Firestore:', err);
      throw err;
    }
  };

  // Global Multi-Section Navigation Badges State
  const [sectionNotifications, setSectionNotifications] = useState<UserSectionUnreadCounts>(
    grobaxNotificationService.getSnapshot().user
  );
  const [adminSectionNotifications, setAdminSectionNotifications] = useState<AdminSectionUnreadCounts>(
    grobaxNotificationService.getSnapshot().admin
  );

  // Initialize Notification Service with current user ID
  useEffect(() => {
    grobaxNotificationService.initUser(firebaseUser?.uid || currentUser.id);
  }, [firebaseUser?.uid, currentUser.id]);

  // Subscribe to Notification Engine unread count updates
  useEffect(() => {
    const unsub = grobaxNotificationService.subscribe(({ user, admin }) => {
      setSectionNotifications((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(user)) return prev;
        return user;
      });
      setAdminSectionNotifications((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(admin)) return prev;
        return admin;
      });
    });
    return () => unsub();
  }, []);

  // Sync state data sources to Notification Engine for automatic real-time unread calculation
  useEffect(() => {
    grobaxNotificationService.updateDataSource({
      userId: firebaseUser?.uid || currentUser.id,
      userRole: currentUser.role,
      posts,
      announcements,
      chatMessages: chatroomMessages,
      platformEvents: events as any,
      qualifications: qualificationCompetitions,
      minimartProducts: minimartProducts as any,
      withdrawals: withdrawals as any,
      transactions: transactions as any,
      studentVerifications: representativeRecords as any,
      reportedPosts: posts.filter(p => p.status === 'Reported'),
      liveFixtures: fixtures as any,
    });
  }, [
    firebaseUser?.uid,
    currentUser.id,
    currentUser.role,
    posts,
    announcements,
    chatroomMessages,
    events,
    qualificationCompetitions,
    minimartProducts,
    withdrawals,
    transactions,
    representativeRecords,
    fixtures,
  ]);

  // When active tab changes, mark that section as read automatically
  useEffect(() => {
    if (activeTab) {
      grobaxNotificationService.markSectionRead(activeTab);
    }
  }, [activeTab]);

  const clearSectionNotification = useCallback((sectionKey: string) => {
    grobaxNotificationService.markSectionRead(sectionKey);
  }, []);

  const markSectionAsRead = useCallback((sectionKey: string) => {
    grobaxNotificationService.markSectionRead(sectionKey);
  }, []);

  const emitSectionNotification = useCallback(
    async (event: {
      section: string;
      title: string;
      message?: string;
      targetRole?: 'USER' | 'ADMIN' | 'ALL';
    }) => {
      await grobaxNotificationService.emitSectionNotification(event);
    },
    []
  );

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...data }));
    if (firebaseUser) {
      try {
        const updated = await updateUserProfileInFirestore(firebaseUser.uid, data);
        setCurrentUser(prev => ({ ...prev, ...updated }));
      } catch (err) {
        console.error('Error updating user profile in Firestore:', err);
        throw err;
      }
    }
  };

  const subscribeToPlan = async (
    plan: SubscriptionPlan,
    paymentMethod: 'GP' | 'CARD' | 'TRANSFER' = 'CARD',
    customPaymentReference?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const days =
        plan.durationUnit === 'Years'
          ? plan.durationValue * 365
          : plan.durationUnit === 'Months'
          ? plan.durationValue * 30
          : plan.durationValue;
      const startDate = new Date().toISOString();
      const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const finalReference =
        customPaymentReference ||
        (paymentMethod === 'GP'
          ? `GP_SUB_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
          : `GRBX_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`);

      // If GP payment, verify and deduct balance
      let newGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
      if (paymentMethod === 'GP') {
        const gpPrice = plan.priceNaira; // 1 GP = 1 Naira standard equivalent
        if (newGp < gpPrice) {
          return {
            success: false,
            message: `Insufficient GP balance. You need ${gpPrice.toLocaleString()} GP to subscribe to this plan.`,
          };
        }
        newGp = Math.max(0, newGp - gpPrice);
        setCurrentUser(prev => ({ ...prev, gpBalance: newGp }));
        addTransaction({
          type: 'subscription_purchase',
          title: `Subscription: ${plan.name}`,
          description: `${plan.durationValue} ${plan.durationUnit} Academic Upgrade (GP Wallet)`,
          amount: gpPrice,
          unit: 'GP',
          isCredit: false,
        });
      } else {
        // Card or Transfer payment via Paystack Gateway
        addTransaction({
          type: 'subscription_purchase',
          title: `Subscription: ${plan.name}`,
          description: `${plan.durationValue} ${plan.durationUnit} Upgrade via Paystack (${finalReference})`,
          amount: plan.priceNaira,
          unit: 'NGN',
          isCredit: false,
        });
      }

      const subRecord: Omit<UserSubscriptionRecord, 'id'> = {
        subscriptionId: `sub_${Date.now()}_${(currentUser.id || 'user').substring(0, 5)}`,
        userId: currentUser.id || firebaseUser?.uid || 'guest',
        userName: currentUser.name || currentUser.fullName || 'Scholar',
        userEmail: currentUser.username || currentUser.email || '',
        planId: plan.planId,
        planNameSnapshot: plan.name,
        priceSnapshot: plan.priceNaira,
        currencySnapshot: 'NGN',
        durationSnapshot: `${plan.durationValue} ${plan.durationUnit}`,
        startDate,
        expiryDate,
        status: 'active',
        paymentReference: finalReference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore userSubscriptions
      try {
        await addDoc(collection(db, 'userSubscriptions'), subRecord);
      } catch (dbErr) {
        console.warn('Saving subscription record notice:', dbErr);
      }

      // Determine new tier attributes
      const gusTier =
        plan.priceNaira >= 20000 ? 'Titan' : plan.priceNaira >= 2000 ? 'Master' : 'Scholar';

      // Update currentUser state
      const updatedUserPatch: Partial<UserProfile> = {
        activePlanId: plan.planId,
        membershipTier: plan.name,
        subscriptionTier: plan.name,
        subscriptionPlan: plan.name,
        planId: plan.planId,
        tier: plan.name,
        plan: plan.name,
        isSubscribed: true,
        isPremium: true,
        gusTier: gusTier as any,
        subscriptionExpiry: expiryDate,
        subscription: {
          planId: plan.planId,
          name: plan.name,
          price: plan.priceNaira,
          currency: 'NGN',
          duration: `${plan.durationValue} ${plan.durationUnit}`,
          startDate,
          expiryDate,
          status: 'active',
          paymentReference: finalReference,
        } as any,
        verified: true, // Pro & VIP scholars receive verified status
        ...(paymentMethod === 'GP' ? { gpBalance: newGp } : {}),
      };

      const targetUid = firebaseUser?.uid || currentUser.id;

      setCurrentUser(prev => {
        const nextUser = {
          ...prev,
          ...updatedUserPatch,
        };
        try {
          if (targetUid) {
            localStorage.setItem(`grobax_user_profile_${targetUid}`, JSON.stringify(nextUser));
          }
        } catch {}
        return nextUser;
      });

      // Update userSubscriptions local state immediately
      setUserSubscriptions(prev => [
        { ...subRecord, id: subRecord.subscriptionId },
        ...prev.filter(s => s.planId !== plan.planId)
      ]);

      // Remove any pending payment record from localStorage
      try {
        localStorage.removeItem('grobax_pending_paystack_sub');
      } catch {}

      // Update user in Firestore
      if (targetUid) {
        try {
          await updateUserProfileInFirestore(targetUid, updatedUserPatch);
        } catch (uErr) {
          console.warn('Updating user profile with subscription notice:', uErr);
        }
      }

      // Send in-app celebration notification specifically to this user
      sendNotification({
        title: `🎉 Upgraded to ${plan.name}!`,
        message: `Your membership has been upgraded to ${plan.name} (${plan.durationValue} ${plan.durationUnit}). Enjoy boosted multipliers, pro verified badge, and priority features!`,
        type: 'system',
        targetUserId: targetUid,
        userId: targetUid,
        actionUrl: '#profile',
      });

      return {
        success: true,
        message: `Successfully upgraded to ${plan.name}! All privileges are now active.`,
      };
    } catch (err: any) {
      console.error('Error subscribing to plan:', err);
      return {
        success: false,
        message: err.message || 'Failed to activate subscription. Please try again.',
      };
    }
  };

  // Automatic Paystack Payment Verification & Activation for pending transactions and redirect callbacks
  useEffect(() => {
    if (!isAuthReady || !currentUser.id) return;

    let isMounted = true;

    async function checkPendingPaystackPayment() {
      try {
        // 1. Check URL search parameters (e.g. redirect callback from Paystack: ?reference=... or ?trxref=...)
        let urlRef = '';
        if (typeof window !== 'undefined' && window.location && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          urlRef = params.get('reference') || params.get('trxref') || '';
        }

        // 2. Check localStorage for pending checkout
        let pendingData: any = null;
        try {
          const raw = localStorage.getItem('grobax_pending_paystack_sub');
          if (raw) {
            pendingData = JSON.parse(raw);
          }
        } catch {}

        const refToVerify = urlRef || pendingData?.reference;
        if (!refToVerify) return;

        const verifyRes = await verifyPaystackTransaction(refToVerify);

        if (isMounted && verifyRes && (verifyRes.verified || verifyRes.status === 'success')) {
          // Find the matching plan
          const targetPlanId = verifyRes.planId || pendingData?.plan?.planId || pendingData?.plan?.id;
          const targetPlanName = verifyRes.planName || pendingData?.plan?.name;

          let matchedPlan = subscriptionPlans.find(
            p => (targetPlanId && (p.planId === targetPlanId || p.id === targetPlanId)) ||
                 (targetPlanName && p.name.toLowerCase() === targetPlanName.toLowerCase())
          );

          if (!matchedPlan) {
            matchedPlan = DEFAULT_SUBSCRIPTION_PLANS.find(
              p => (targetPlanId && (p.planId === targetPlanId || p.id === targetPlanId)) ||
                   (targetPlanName && p.name.toLowerCase() === targetPlanName.toLowerCase())
            );
          }

          if (!matchedPlan && pendingData?.plan) {
            matchedPlan = pendingData.plan;
          }

          if (!matchedPlan) {
            matchedPlan = DEFAULT_SUBSCRIPTION_PLANS[0];
          }

          if (matchedPlan) {
            await subscribeToPlan(matchedPlan, 'CARD', refToVerify);

            // Clean up URL and localStorage
            try {
              localStorage.removeItem('grobax_pending_paystack_sub');
              if (urlRef && window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Pending Paystack payment check notice:', err);
      }
    }

    checkPendingPaystackPayment();

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, currentUser.id, subscriptionPlans]);

  return (
    <AppContext.Provider
      value={{
        isAuthReady,
        role,
        setRole,
        toggleRepresentativeStatus,
        theme,
        setTheme,
        resolvedTheme,
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        isWalletModalOpen,
        setIsWalletModalOpen,
        walletModalTab,
        setWalletModalTab,
        openWalletModal,
        subscriptionPlans,
        activeSubscriptionPlans: subscriptionPlans.filter(p => p.active !== false),
        subscribeToPlan,
        isUserSubscribed,
        isUpgradePromoVisible,
        dismissUpgradePromo,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        openAuthModal,
        login,
        logout,
        firebaseUser,
        posts,
        setPosts,
        events,
        toggleEventRegistration,
        announcements,
        addAnnouncement,
        createPost,
        toggleLikePost,
        claimReward,
        badgeStore,
        buyBadge,
        withdrawals,
        requestGpWithdrawal,
        updatePrivacy,
        isBalanceHidden,
        toggleBalanceHidden,
        masterInstitutions,
        addMasterInstitution,
        updateMasterInstitution,
        addDepartmentToInstitution,
        removeDepartmentFromInstitution,
        toggleInstitutionSeason,
        toggleInstitutionHidden,
        seasons,
        addSeason,
        updateSeasonStatus,
        toggleSeasonParticipation,
        questionSets,
        addQuestionSet,
        addQuestionToSet,
        qualificationCompetitions,
        addQualificationCompetition,
        representativeRecords,
        representativeAssignments,
        assignRepresentative,
        removeRepresentative,
        fixtures,
        updateFixtureScore,
        addFixture,
        updateFixtureState,
        calculateStandings,
        gusSeasons,
        activeGusSeason,
        gusParticipants,
        userGusRecord,
        gusLiveClock,
        registerForGusSeason,
        submitGusAnswer,
        addGusSeason,
        updateGusSeason,
        addGusRoundToSeason,
        updateGusRoundInSeason,
        addQuestionToGusRound,
        updateGusPrizes,
        adminControlGusCompetition,
        domeSessions,
        activeDomeSession,
        domeScoreboard,
        domeUserProgress,
        domeHistory,
        domeLiveClock,
        submitDomeAnswer,
        addDomeSession,
        updateDomeSession,
        addQuestionToDomeSession,
        adminControlDomeSession,

        // Grobax Minimart & Chatroom
        chatroomMessages,
        sendChatroomMessage,
        deleteChatroomMessage,
        reactChatroomMessage,
        minimartProducts,
        minimartCategories,
        minimartConfig,
        minimartReports,
        addMinimartProduct,
        updateMinimartProduct,
        deleteMinimartProduct,
        reportMinimartProduct,
        updateMinimartProductStatus,
        saveMinimartCategory,
        deleteMinimartCategory,
        saveMinimartConfig,
        moderateMinimartReport,
        checkUserListingEligibility,

        updateAnnouncement,
        deleteAnnouncement,
        publishAnnouncement,
        scheduleAnnouncement,
        unpublishAnnouncement,
        pinAnnouncement,
        hidePost,
        deletePost,
        updatePost,
        deletePlatformEvent,
        restorePost,
        reportPost,
        addCommentToPost,
        toggleLikeComment,
        deleteComment,
        suspendUserPosting,
        transactions,
        addTransaction,
        gpConversionConfig,
        updateGpConversionConfig,
        updateWithdrawalStatus,
        adminAdjustGpBalance,
        adminAdjustTargetUserGp,
        addBadgeToStore,
        updateBadgeInStore,
        equipBadge,
        sponsorshipCampaigns,
        addSponsorshipCampaign,
        updateSponsorshipCampaign,
        deleteSponsorshipCampaign,
        upgradePlans,
        updateUpgradePlan,
        notifications,
        markNotificationRead,
        sendNotification,
        addNotification: sendNotification,
        sectionNotifications,
        adminSectionNotifications,
        clearSectionNotification,
        markSectionAsRead,
        emitSectionNotification,
        systemSettings,
        updateSystemSettings,
        updateUserProfile,
        userProfile: currentUser,
        toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),

        triggerAiBroadcast,
        selectedRoleUser: MOCK_USERS[role],
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
