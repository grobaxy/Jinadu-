import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Sparkles,
  Sliders,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Crown,
  ChevronRight,
  ChevronLeft,
  X,
  Lock,
  Bell,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PastQuestion, PastQuestionSettings, PastQuestionStatus } from '../../types';
import {
  fetchAllPastQuestionsForAdmin,
  moderatePastQuestion,
  fetchPastQuestionSettings,
  savePastQuestionSettings,
  subscribeToAdminPastQuestions,
  DEFAULT_PAST_QUESTION_SETTINGS,
} from '../../lib/pastQuestionsService';
import { PastQuestionViewerModal } from '../Library/PastQuestionViewerModal';

export const AdminLibraryView: React.FC = () => {
  const { currentUser } = useApp();

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'moderation' | 'settings'>('moderation');
  const [statusFilter, setStatusFilter] = useState<PastQuestionStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Moderation List & Loading
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<PastQuestionSettings>(DEFAULT_PAST_QUESTION_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isVipCustomNumber, setIsVipCustomNumber] = useState<boolean>(false);
  const [vipCustomLimit, setVipCustomLimit] = useState<number>(20);

  // Active Inspection / Modal
  const [inspectQuestion, setInspectQuestion] = useState<PastQuestion | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; question: PastQuestion | null; reason: string }>({
    isOpen: false,
    question: null,
    reason: '',
  });
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; question: PastQuestion | null; gpReward: number }>({
    isOpen: false,
    question: null,
    gpReward: 50,
  });

  // Load Admin Data
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [allQuestions, appSettings] = await Promise.all([
        fetchAllPastQuestionsForAdmin(),
        fetchPastQuestionSettings(),
      ]);
      setQuestions(allQuestions);
      setSettings(appSettings);
      if (typeof appSettings.vipDailyViewLimit === 'number') {
        setIsVipCustomNumber(true);
        setVipCustomLimit(appSettings.vipDailyViewLimit);
      } else {
        setIsVipCustomNumber(false);
      }
    } catch (err) {
      console.warn('Error loading admin past questions data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPastQuestionSettings().then((appSettings) => {
      setSettings(appSettings);
      if (typeof appSettings.vipDailyViewLimit === 'number') {
        setIsVipCustomNumber(true);
        setVipCustomLimit(appSettings.vipDailyViewLimit);
      } else {
        setIsVipCustomNumber(false);
      }
    });

    const unsub = subscribeToAdminPastQuestions((allQuestions) => {
      setQuestions(allQuestions);
      setIsLoading(false);
      setIsRefreshing(false);
    });

    return () => unsub();
  }, []);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    let list = [...questions];

    if (statusFilter !== 'all') {
      list = list.filter((q) => q.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.courseCode.toLowerCase().includes(q) ||
          item.courseTitle.toLowerCase().includes(q) ||
          item.institutionName.toLowerCase().includes(q) ||
          item.departmentName.toLowerCase().includes(q) ||
          item.uploadedByName.toLowerCase().includes(q) ||
          item.academicSession.toLowerCase().includes(q)
      );
    }

    return list;
  }, [questions, statusFilter, searchQuery]);

  // Counts
  const pendingCount = useMemo(() => questions.filter((q) => q.status === 'pending').length, [questions]);
  const approvedCount = useMemo(() => questions.filter((q) => q.status === 'approved').length, [questions]);
  const rejectedCount = useMemo(() => questions.filter((q) => q.status === 'rejected').length, [questions]);
  const totalGpAwarded = useMemo(
    () => questions.filter((q) => q.status === 'approved').reduce((sum, q) => sum + (q.gpAwarded || 50), 0),
    [questions]
  );

  // Handle Approve
  const handleApprove = async () => {
    if (!approvalModal.question) return;
    const reviewer = {
      uid: currentUser?.uid || 'admin_sys',
      name: currentUser?.fullName || currentUser?.username || 'Admin Moderator',
    };

    const res = await moderatePastQuestion(approvalModal.question.id, 'approve', reviewer, {
      customGpReward: approvalModal.gpReward,
    });

    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setApprovalModal({ isOpen: false, question: null, gpReward: 50 });
      loadAdminData();
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Failed to approve' });
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!rejectionModal.question) return;
    const reviewer = {
      uid: currentUser?.uid || 'admin_sys',
      name: currentUser?.fullName || currentUser?.username || 'Admin Moderator',
    };

    const res = await moderatePastQuestion(rejectionModal.question.id, 'reject', reviewer, {
      rejectionReason: rejectionModal.reason || 'Does not meet academic verification standards or is illegible.',
    });

    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setRejectionModal({ isOpen: false, question: null, reason: '' });
      loadAdminData();
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Failed to reject' });
    }
  };

  // Handle Delete
  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this past question document?')) {
      return;
    }
    const reviewer = {
      uid: currentUser?.uid || 'admin_sys',
      name: currentUser?.fullName || currentUser?.username || 'Admin Moderator',
    };
    const res = await moderatePastQuestion(questionId, 'delete', reviewer);
    if (res.success) {
      setActionMessage({ type: 'success', text: 'Past question document deleted.' });
      loadAdminData();
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const updated = await savePastQuestionSettings({
        ...settings,
        vipDailyViewLimit: isVipCustomNumber ? Number(vipCustomLimit) || 20 : 'unlimited',
      });
      setSettings(updated);
      setActionMessage({ type: 'success', text: 'Past Question settings updated successfully!' });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to save settings.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div id="admin-past-questions-view" className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Academic Moderation Command Center
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {pendingCount} Pending Review
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Past Questions Library Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review student uploads, verify curriculum accuracy, award GP bounties, and configure access limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                loadAdminData();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Sub-tab switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setAdminTab('moderation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminTab === 'moderation' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verification Queue ({pendingCount})
              </button>
              <button
                onClick={() => setAdminTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminTab === 'settings' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Settings & Limits
              </button>
            </div>
          </div>
        </div>

        {/* Global Action Feedback */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Dynamic Pending Moderation Real-Time Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                {pendingCount} Past Question{pendingCount > 1 ? 's' : ''} Awaiting Admin Verification
              </h4>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                Scholars have submitted new past questions. Verify document authenticity to credit their GP wallets.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setAdminTab('moderation');
              setStatusFilter('pending');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shrink-0 shadow-xs cursor-pointer transition"
          >
            Filter Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Pending Review</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Approved & Live</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Rejected Submissions</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-rose-600">{rejectedCount}</p>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total GP Awarded</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold text-indigo-600">+{totalGpAwarded} GP</p>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      </div>

      {/* TAB 1: MODERATION QUEUE */}
      {adminTab === 'moderation' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({questions.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search course code, student, school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Questions Moderation List */}
          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 mx-auto text-indigo-600 animate-spin mb-2" />
              <p className="text-xs text-slate-600">Loading submissions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Past Questions in Queue</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All submitted past examination papers in this status have been reviewed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {q.institutionCategory}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{q.courseCode}</h3>
                      <span className="text-xs font-medium text-slate-600">— {q.courseTitle}</span>

                      {q.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Review
                        </span>
                      ) : q.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved (+{q.gpAwarded || 50} GP)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>{q.institutionName}</strong> • {q.facultyName} • {q.departmentName}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span>Session: <strong>{q.academicSession}</strong></span>
                      <span>•</span>
                      <span>Semester: <strong>{q.semester}</strong></span>
                      <span>•</span>
                      <span>Level: <strong>{q.level}</strong></span>
                      <span>•</span>
                      <span>Exam: <strong>{q.examType || 'Main Exam'}</strong></span>
                      <span>•</span>
                      <span>Pages: <strong>{q.pagesCount || 1}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <span>Uploaded by: <strong className="text-slate-700">{q.uploadedByName}</strong> ({q.uploadedByEmail || 'N/A'})</span>
                      <span>•</span>
                      <span>{new Date(q.uploadedAt).toLocaleString()}</span>
                    </div>

                    {q.rejectionReason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 mt-2">
                        <strong>Rejection Reason:</strong> {q.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-end">
                    {/* Inspect Document Preview */}
                    <button
                      onClick={() => {
                        setInspectQuestion(q);
                        setIsViewerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Document
                    </button>

                    {/* Approve Button */}
                    {q.status !== 'approved' && (
                      <button
                        onClick={() =>
                          setApprovalModal({
                            isOpen: true,
                            question: q,
                            gpReward: settings.uploadGpReward || 50,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Award GP
                      </button>
                    )}

                    {/* Reject Button */}
                    {q.status !== 'rejected' && (
                      <button
                        onClick={() =>
                          setRejectionModal({
                            isOpen: true,
                            question: q,
                            reason: '',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete document permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SETTINGS & LIMITS */}
      {adminTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Past Question Quotas & Economy Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set the GP bounty awarded to contributors and daily viewing limits across subscription tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* GP Bounty per approved contribution */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Upload Bounty (GP Reward Per Approved Past Question)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Automatically credited to the student's wallet immediately upon moderator verification.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={settings.uploadGpReward}
                  onChange={(e) => setSettings({ ...settings, uploadGpReward: Number(e.target.value) })}
                  className="w-32 px-3 py-2 text-sm font-bold text-indigo-600 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-xs font-semibold text-slate-700">GP per verified submission</span>
              </div>
            </div>

            {/* Max Uploads Per Student Per Week */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Weekly Upload Limit Per Contributor
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Prevents spam by restricting users to 1 (or configured) past question submissions on a weekly basis.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxUploadsPerWeek || settings.maxUploadsPerDay || 1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxUploadsPerWeek: Number(e.target.value),
                      maxUploadsPerDay: Number(e.target.value),
                    })
                  }
                  className="w-32 px-3 py-2 text-sm font-bold text-slate-800 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-xs font-semibold text-slate-700">upload{Number(settings.maxUploadsPerWeek || 1) === 1 ? '' : 's'} / contributor / week</span>
              </div>
            </div>

            {/* Free Tier Daily View Limit */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Free Tier Daily Viewing Quota
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Maximum number of past examination question papers a free scholar can view per day (Default: 2).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.freeDailyViewLimit}
                  onChange={(e) => setSettings({ ...settings, freeDailyViewLimit: Number(e.target.value) })}
                  className="w-32 px-3 py-2 text-sm font-bold text-slate-800 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-xs font-semibold text-slate-700">past question views / day</span>
              </div>
            </div>

            {/* Premium Tier Daily View Limit */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Premium Tier Daily Viewing Quota
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Daily quota for active Premium subscribers (Default: 10).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.premiumDailyViewLimit}
                  onChange={(e) => setSettings({ ...settings, premiumDailyViewLimit: Number(e.target.value) })}
                  className="w-32 px-3 py-2 text-sm font-bold text-indigo-600 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-xs font-semibold text-slate-700">views / day</span>
              </div>
            </div>

            {/* VIP Tier View Quota */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                VIP Tier Viewing Limit
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Quota for top-tier VIP scholars. Typically unlimited.
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vipLimitRadio"
                    checked={!isVipCustomNumber}
                    onChange={() => setIsVipCustomNumber(false)}
                    className="text-indigo-600"
                  />
                  Unlimited Views (Recommended)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vipLimitRadio"
                    checked={isVipCustomNumber}
                    onChange={() => setIsVipCustomNumber(true)}
                    className="text-indigo-600"
                  />
                  Custom Numeric Cap:
                </label>
                {isVipCustomNumber && (
                  <input
                    type="number"
                    min="1"
                    value={vipCustomLimit}
                    onChange={(e) => setVipCustomLimit(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all"
            >
              {isSavingSettings ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* Approval & GP Bounty Modal */}
      {approvalModal.isOpen && approvalModal.question && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Approve & Award GP Reward
              </h3>
              <button
                onClick={() => setApprovalModal({ isOpen: false, question: null, gpReward: 50 })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><strong>Course:</strong> {approvalModal.question.courseCode} - {approvalModal.question.courseTitle}</p>
              <p><strong>Institution:</strong> {approvalModal.question.institutionName}</p>
              <p><strong>Session:</strong> {approvalModal.question.academicSession} ({approvalModal.question.semester})</p>
              <p><strong>Contributor:</strong> {approvalModal.question.uploadedByName}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GP Reward to Credit Contributor
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={approvalModal.gpReward}
                onChange={(e) =>
                  setApprovalModal({ ...approvalModal, gpReward: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-bold text-indigo-600 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Will be credited to {approvalModal.question.uploadedByName}'s wallet atomically with a completion log.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModal({ isOpen: false, question: null, gpReward: 50 })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm Approval (+{approvalModal.gpReward} GP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && rejectionModal.question && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Past Question Submission
              </h3>
              <button
                onClick={() => setRejectionModal({ isOpen: false, question: null, reason: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Feedback for Contributor (Required)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. The uploaded paper is blurry/illegible, please re-scan with good lighting."
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModal({ isOpen: false, question: null, reason: '' })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector In-App Viewer Modal */}
      <PastQuestionViewerModal
        question={inspectQuestion}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setInspectQuestion(null);
        }}
        currentUser={currentUser}
      />
    </div>
  );
};
