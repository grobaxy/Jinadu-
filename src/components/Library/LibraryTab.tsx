import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Search,
  UploadCloud,
  Bookmark,
  Building,
  GraduationCap,
  Layers,
  Calendar,
  Sparkles,
  Shield,
  Clock,
  Eye,
  CheckCircle2,
  Crown,
  Lock,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Compass,
  AlertCircle,
  FileQuestion,
  User,
  Zap,
} from 'lucide-react';
import { PastQuestion, PastQuestionSettings } from '../../types';
import {
  fetchApprovedPastQuestions,
  fetchUserPastQuestions,
  fetchPastQuestionSettings,
  checkAndRecordPastQuestionView,
  fetchUserDailyViewQuota,
  togglePastQuestionBookmark,
  fetchUserBookmarkedQuestionIds,
  checkUserWeeklyUploadLimit,
  seedSamplePastQuestionsIfEmpty,
  getTodayDateKey,
} from '../../lib/pastQuestionsService';
import {
  INSTITUTION_CATEGORIES,
  ACADEMIC_CURRICULUM_DATA,
  InstitutionCategory,
} from '../../data/libraryAcademicData';
import { NIGERIAN_INSTITUTIONS } from '../../data/nigerianInstitutions';
import { PastQuestionCard } from './PastQuestionCard';
import { PastQuestionViewerModal } from './PastQuestionViewerModal';
import { PastQuestionUploadModal } from './PastQuestionUploadModal';
import { MyContributionsView } from './MyContributionsView';
import { BookmarksView } from './BookmarksView';
import { resolveUserSubscriptionTier } from '../../lib/campusService';

export const LibraryTab: React.FC = () => {
  const { currentUser, userProfile, isUserSubscribed, openWalletModal } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'browse' | 'contributions' | 'bookmarks'>('browse');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All Faculties');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
  const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
  const [selectedSession, setSelectedSession] = useState<string>('All Sessions');
  const [selectedSemester, setSelectedSemester] = useState<string>('All Semesters');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMyDeptFilterActive, setIsMyDeptFilterActive] = useState<boolean>(false);

  // Data States
  const [approvedQuestions, setApprovedQuestions] = useState<PastQuestion[]>([]);
  const [userContributions, setUserContributions] = useState<PastQuestion[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [viewedQuestionIdsToday, setViewedQuestionIdsToday] = useState<string[]>([]);
  const [settings, setSettings] = useState<PastQuestionSettings>({
    enabled: true,
    uploadGpReward: 50,
    freeDailyViewLimit: 2,
    premiumDailyViewLimit: 10,
    vipDailyViewLimit: 'unlimited',
    allowUserUploads: true,
    requireVerification: true,
    maxUploadsPerWeek: 1,
    maxUploadsPerDay: 1,
  });

  // Daily View Quota State
  const [dailyViewQuota, setDailyViewQuota] = useState<{
    viewsToday: number;
    dailyLimit: number | 'unlimited';
    remainingViews: number | 'unlimited';
  }>({
    viewsToday: 0,
    dailyLimit: 2,
    remainingViews: 2,
  });

  // Weekly Upload Quota State
  const [weeklyUploadQuota, setWeeklyUploadQuota] = useState<{
    canUpload: boolean;
    weekUploadCount: number;
    maxUploadsPerWeek: number;
    remainingUploads: number;
    currentWeekKey: string;
  }>({
    canUpload: true,
    weekUploadCount: 0,
    maxUploadsPerWeek: 1,
    remainingUploads: 1,
    currentWeekKey: '',
  });

  // Modals
  const [selectedQuestionForView, setSelectedQuestionForView] = useState<PastQuestion | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [quotaExceededModal, setQuotaExceededModal] = useState<{
    isOpen: boolean;
    message?: string;
  }>({ isOpen: false });

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Determine user tier accurately across all subscription plans
  const userTier: 'free' | 'premium' | 'vip' = useMemo(() => {
    return resolveUserSubscriptionTier(userProfile || currentUser);
  }, [currentUser, userProfile, isUserSubscribed]);

  // Derived user-facing plan title
  const planDisplayName = useMemo(() => {
    if (userTier === 'vip') return 'VIP Scholar Plan';
    if (userTier === 'premium') return 'Premium Scholar Plan';
    return 'Free Scholar Plan';
  }, [userTier]);

  // Load Data
  const loadLibraryData = async () => {
    setIsLoading(true);
    try {
      // Seed sample data if empty
      await seedSamplePastQuestionsIfEmpty();

      // Load settings
      const cfg = await fetchPastQuestionSettings();
      setSettings(cfg);

      // Load approved past questions
      const questions = await fetchApprovedPastQuestions();
      setApprovedQuestions(questions);

      // User specific data
      const uid = currentUser?.uid || '';
      const [contribs, bookmarks, uploadCheck, viewQuota] = await Promise.all([
        uid ? fetchUserPastQuestions(uid) : Promise.resolve([]),
        uid ? fetchUserBookmarkedQuestionIds(uid) : Promise.resolve([]),
        uid ? checkUserWeeklyUploadLimit(uid) : Promise.resolve({ canUpload: true, weekUploadCount: 0, maxUploadsPerWeek: 1, remainingUploads: 1, currentWeekKey: '' }),
        fetchUserDailyViewQuota(uid, userTier),
      ]);
      setUserContributions(contribs);
      setBookmarkedIds(bookmarks);
      setWeeklyUploadQuota(uploadCheck);
      setDailyViewQuota({
        viewsToday: viewQuota.viewsToday,
        dailyLimit: viewQuota.dailyLimit,
        remainingViews: viewQuota.remainingViews,
      });
      setViewedQuestionIdsToday(viewQuota.viewedQuestionIdsToday);
    } catch (err) {
      console.warn('Error loading library data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLibraryData();
  }, [currentUser?.uid, userTier]);

  // Handle My Department quick filter toggle
  const toggleMyDepartmentFilter = () => {
    if (!isMyDeptFilterActive) {
      if (currentUser?.department) {
        setSelectedDepartment(currentUser.department);
        setIsMyDeptFilterActive(true);
      } else {
        setIsMyDeptFilterActive(true);
      }
    } else {
      setSelectedDepartment('All Departments');
      setIsMyDeptFilterActive(false);
    }
  };

  // Filtered approved past questions
  const filteredQuestions = useMemo(() => {
    let list = [...approvedQuestions];

    if (selectedCategory !== 'All Categories') {
      list = list.filter((q) => q.institutionCategory === selectedCategory);
    }

    if (selectedInstitution !== 'all') {
      list = list.filter(
        (q) => q.institutionId === selectedInstitution || q.institutionName === selectedInstitution
      );
    }

    if (selectedFaculty !== 'All Faculties') {
      list = list.filter((q) => q.facultyName === selectedFaculty);
    }

    if (selectedDepartment !== 'All Departments') {
      list = list.filter(
        (q) => q.departmentName.toLowerCase() === selectedDepartment.toLowerCase()
      );
    }

    if (selectedLevel !== 'All Levels') {
      list = list.filter((q) => q.level.toLowerCase().includes(selectedLevel.toLowerCase()));
    }

    if (selectedSession !== 'All Sessions') {
      list = list.filter((q) => q.academicSession === selectedSession);
    }

    if (selectedSemester !== 'All Semesters') {
      list = list.filter((q) => q.semester.toLowerCase().includes(selectedSemester.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      list = list.filter(
        (q) =>
          q.courseCode.toLowerCase().includes(qLower) ||
          q.courseTitle.toLowerCase().includes(qLower) ||
          q.departmentName.toLowerCase().includes(qLower) ||
          q.facultyName.toLowerCase().includes(qLower) ||
          q.institutionName.toLowerCase().includes(qLower) ||
          q.academicSession.toLowerCase().includes(qLower) ||
          (q.lecturerName && q.lecturerName.toLowerCase().includes(qLower))
      );
    }

    return list;
  }, [
    approvedQuestions,
    selectedCategory,
    selectedInstitution,
    selectedFaculty,
    selectedDepartment,
    selectedLevel,
    selectedSession,
    selectedSemester,
    searchQuery,
  ]);

  // Bookmarked questions list
  const bookmarkedQuestions = useMemo(() => {
    return approvedQuestions.filter((q) => bookmarkedIds.includes(q.id));
  }, [approvedQuestions, bookmarkedIds]);

  // Handle View Past Question with daily quota check
  const handleViewQuestion = async (question: PastQuestion) => {
    const uid = currentUser?.uid || '';
    const res = await checkAndRecordPastQuestionView(uid, question.id, userTier);

    setDailyViewQuota({
      viewsToday: res.viewsToday,
      dailyLimit: res.dailyLimit,
      remainingViews: res.remainingViews,
    });

    if (res.allowed) {
      setViewedQuestionIdsToday((prev) => Array.from(new Set([...prev, question.id])));
    }

    if (!res.allowed) {
      setQuotaExceededModal({
        isOpen: true,
        message: res.message || 'Daily viewing limit reached.',
      });
      return;
    }

    setSelectedQuestionForView(question);
    setIsViewerOpen(true);
  };

  // Handle Bookmark toggle
  const handleToggleBookmark = async (questionId: string) => {
    if (!currentUser?.uid) return;
    const isNowBookmarked = await togglePastQuestionBookmark(currentUser.uid, questionId);
    if (isNowBookmarked) {
      setBookmarkedIds((prev) => [...prev, questionId]);
    } else {
      setBookmarkedIds((prev) => prev.filter((id) => id !== questionId));
    }
  };

  // Available Faculties for chosen category
  const availableFaculties = useMemo(() => {
    if (selectedCategory === 'All Categories') {
      return Array.from(new Set(ACADEMIC_CURRICULUM_DATA.map((f) => f.faculty)));
    }
    return ACADEMIC_CURRICULUM_DATA.filter((f) => f.category === selectedCategory).map(
      (f) => f.faculty
    );
  }, [selectedCategory]);

  // Available Departments for chosen faculty
  const availableDepartments = useMemo(() => {
    if (selectedFaculty === 'All Faculties') {
      const allDepts: string[] = [];
      ACADEMIC_CURRICULUM_DATA.forEach((fac) => {
        fac.departments.forEach((dept) => {
          if (!allDepts.includes(dept.name)) allDepts.push(dept.name);
        });
      });
      return allDepts;
    }
    const facObj = ACADEMIC_CURRICULUM_DATA.find((f) => f.faculty === selectedFaculty);
    return facObj ? facObj.departments.map((d) => d.name) : [];
  }, [selectedFaculty]);

  // Available Sessions
  const SESSION_OPTIONS = [
    'All Sessions',
    '2024/2025',
    '2023/2024',
    '2022/2023',
    '2021/2022',
    '2020/2021',
  ];

  return (
    <div id="grobax-academic-library" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-200">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title & Badge */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Shield className="w-3.5 h-3.5" />
                  Verified Past Questions Library
                </span>
                
                {/* Identified Plan Badge */}
                {userTier === 'vip' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs">
                    <Crown className="w-3.5 h-3.5 fill-current text-slate-950" />
                    {planDisplayName} • Unlimited Access
                  </span>
                ) : userTier === 'premium' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs">
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                    {planDisplayName} • 10 Views/Day
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    {planDisplayName} • {settings.freeDailyViewLimit} Free Views/Day
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Earn +{settings.uploadGpReward} GP Per Upload
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Academic Past Questions Vault
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Browse verified tertiary examination questions from Nigerian universities, polytechnics, and colleges. View securely in-app or contribute past papers for GP rewards.
              </p>
            </div>

            {/* Action Buttons & Quota Status */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Daily View Quota Pill */}
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Daily View Quota
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {userTier === 'vip' ? (
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        Unlimited (VIP)
                      </span>
                    ) : (
                      <span className={dailyViewQuota.remainingViews === 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                        {dailyViewQuota.viewsToday} / {dailyViewQuota.dailyLimit} Used ({userTier.toUpperCase()})
                      </span>
                    )}
                  </span>
                </div>
                {userTier !== 'vip' && (
                  <button
                    onClick={() => openWalletModal?.()}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Upgrade
                  </button>
                )}
              </div>

              {/* Weekly Upload Quota Pill */}
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Weekly Upload Quota
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {weeklyUploadQuota.remainingUploads > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {weeklyUploadQuota.remainingUploads} upload left this week
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Quota used ({weeklyUploadQuota.maxUploadsPerWeek}/week)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Upload Past Question Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                id="open-pq-upload-modal-btn"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Past Question (+{settings.uploadGpReward} GP)
              </button>
            </div>
          </div>

          {/* Daily limit reached warning banner */}
          {dailyViewQuota.remainingViews === 0 && dailyViewQuota.dailyLimit !== 'unlimited' && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Daily Past Questions View Limit Reached ({dailyViewQuota.viewsToday}/{dailyViewQuota.dailyLimit})</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                    You have reached the maximum daily question views for your {userTier.toUpperCase()} plan. Upgrade to Premium (10/day) or VIP (Unlimited) to unlock all past questions!
                  </p>
                </div>
              </div>
              <button
                onClick={() => openWalletModal?.()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-200" />
                Upgrade Plan
              </button>
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('browse')}
              id="library-tab-browse"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'browse'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Browse Questions ({approvedQuestions.length})
            </button>

            <button
              onClick={() => setActiveTab('contributions')}
              id="library-tab-contributions"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'contributions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              My Uploads ({userContributions.length})
              {weeklyUploadQuota.remainingUploads > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
                  {weeklyUploadQuota.remainingUploads} left
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              id="library-tab-bookmarks"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'bookmarks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Vault ({bookmarkedIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Search and Quick Filters Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              {/* Primary Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by Course Code (e.g., CSC 201, MEE 311), Course Title, Lecturer, or Department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Multi-Dimensional Filter Dropdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {/* Institution Category */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedFaculty('All Faculties');
                      setSelectedDepartment('All Departments');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Categories">All Categories</option>
                    {INSTITUTION_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Institution */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Institution
                  </label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="all">All Institutions</option>
                    {NIGERIAN_INSTITUTIONS.map((inst) => (
                      <option key={inst.id} value={inst.name}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Faculty / School
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value);
                      setSelectedDepartment('All Departments');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="All Faculties">All Faculties</option>
                    {availableFaculties.map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="All Departments">All Departments</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Session */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Session
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    {SESSION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Semesters">All Semesters</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              {/* Quick Profile Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Quick Filter:</span>
                  {currentUser?.department && (
                    <button
                      onClick={toggleMyDepartmentFilter}
                      className={`px-3 py-1 rounded-full font-semibold border transition-all ${
                        isMyDeptFilterActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      🎓 My Department ({currentUser.department})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory('All Categories');
                      setSelectedInstitution('all');
                      setSelectedFaculty('All Faculties');
                      setSelectedDepartment('All Departments');
                      setSelectedLevel('All Levels');
                      setSelectedSession('All Sessions');
                      setSelectedSemester('All Semesters');
                      setSearchQuery('');
                      setIsMyDeptFilterActive(false);
                    }}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium underline ml-1"
                  >
                    Reset All Filters
                  </button>
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                  Showing <strong className="text-slate-900 dark:text-slate-100">{filteredQuestions.length}</strong> past question{filteredQuestions.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Questions Grid */}
            {isLoading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading verified past examination questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <FileQuestion className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Past Questions Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  We could not find examination questions matching your current filters. Be the first to upload and earn +{settings.uploadGpReward} GP!
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload This Past Question (+{settings.uploadGpReward} GP)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuestions.map((question) => (
                  <PastQuestionCard
                    key={question.id}
                    question={question}
                    isBookmarked={bookmarkedIds.includes(question.id)}
                    onView={handleViewQuestion}
                    onToggleBookmark={handleToggleBookmark}
                    isViewDisabled={dailyViewQuota.remainingViews === 0 && dailyViewQuota.dailyLimit !== 'unlimited'}
                    isAlreadyViewedToday={viewedQuestionIdsToday.includes(question.id)}
                    userTier={userTier}
                    onUpgradePrompt={() => openWalletModal?.()}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Contributions */}
        {activeTab === 'contributions' && (
          <MyContributionsView
            contributions={userContributions}
            onView={handleViewQuestion}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            canUploadToday={weeklyUploadQuota.canUpload}
            remainingUploads={weeklyUploadQuota.remainingUploads}
          />
        )}

        {/* Tab 3: Saved Bookmarks */}
        {activeTab === 'bookmarks' && (
          <BookmarksView
            bookmarkedQuestions={bookmarkedQuestions}
            onView={handleViewQuestion}
            onToggleBookmark={handleToggleBookmark}
            onBrowseAll={() => setActiveTab('browse')}
          />
        )}
      </div>

      {/* Secure In-App Viewer Modal */}
      <PastQuestionViewerModal
        question={selectedQuestionForView}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setSelectedQuestionForView(null);
        }}
        currentUser={currentUser}
      />

      {/* Upload Past Question Modal */}
      <PastQuestionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={loadLibraryData}
        currentUser={{
          uid: currentUser?.uid || '',
          username: (userProfile as any)?.username || (currentUser as any)?.username,
          fullName: (userProfile as any)?.fullName || (currentUser as any)?.fullName || (currentUser as any)?.displayName,
          email: currentUser?.email || '',
          institution: (userProfile as any)?.institution || (currentUser as any)?.institution || (userProfile as any)?.school,
          faculty: (userProfile as any)?.faculty || (currentUser as any)?.faculty,
          department: (userProfile as any)?.department || (currentUser as any)?.department,
          level: (userProfile as any)?.level || (currentUser as any)?.level,
        }}
        existingQuestions={approvedQuestions}
      />

      {/* Quota Exceeded Modal */}
      {quotaExceededModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
              <Crown className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Quota Reached</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {quotaExceededModal.message ||
                  `You have used your daily limit of ${settings.freeDailyViewLimit} past questions for your Free plan. Upgrade to Premium (10 views/day) or VIP (Unlimited) to access unlimited examination records!`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setQuotaExceededModal({ isOpen: false })}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setQuotaExceededModal({ isOpen: false });
                  openWalletModal?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                Upgrade Membership
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

