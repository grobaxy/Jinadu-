import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CompetitionHint,
  CompetitionHintType,
  HintSubscriptionTier,
  HintStatus,
} from '../../types';
import {
  subscribeToCompetitionHints,
  createCompetitionHint,
  updateCompetitionHint,
  deleteCompetitionHint,
  getCachedCompetitionHints,
} from '../../lib/hintsService';
import {
  Lightbulb,
  Plus,
  Edit3,
  Trash2,
  Trophy,
  Swords,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Lock,
  Unlock,
  BookOpen,
  Target,
  FileText,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface HintFormData {
  competitionType: CompetitionHintType;
  title: string;
  category: string;
  topic: string;
  areasToPrepare: string[];
  newAreaInput: string;
  preparationMessage: string;
  accessLevel: HintSubscriptionTier;
  status: HintStatus;
}

const DEFAULT_FORM_DATA: HintFormData = {
  competitionType: 'daily_qa',
  title: '',
  category: '',
  topic: '',
  areasToPrepare: [],
  newAreaInput: '',
  preparationMessage: '',
  accessLevel: 'both',
  status: 'published',
};

export function AdminHintsView() {
  const { currentUser } = useApp();

  const [hints, setHints] = useState<CompetitionHint[]>(() => getCachedCompetitionHints());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<'all' | CompetitionHintType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | HintStatus>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHintId, setEditingHintId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HintFormData>(DEFAULT_FORM_DATA);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [hintToDelete, setHintToDelete] = useState<CompetitionHint | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Subscribe to real-time hints
  useEffect(() => {
    const unsub = subscribeToCompetitionHints(
      (updatedHints) => {
        setHints(updatedHints);
        setLoading(false);
      },
      (err) => {
        console.warn('Admin hints listener error:', err);
        setLoading(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = hints.length;
    const published = hints.filter((h) => h.status === 'published').length;
    const drafts = hints.filter((h) => h.status === 'draft').length;
    const hidden = hints.filter((h) => h.status === 'hidden').length;
    const dailyQA = hints.filter((h) => h.competitionType === 'daily_qa').length;
    const schoolDome = hints.filter((h) => h.competitionType === 'school_dome').length;

    return { total, published, drafts, hidden, dailyQA, schoolDome };
  }, [hints]);

  // Filtered hints
  const filteredHints = useMemo(() => {
    return hints.filter((hint) => {
      if (competitionFilter !== 'all' && hint.competitionType !== competitionFilter) {
        return false;
      }
      if (statusFilter !== 'all' && hint.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = hint.title.toLowerCase().includes(q);
        const matchCategory = hint.category.toLowerCase().includes(q);
        const matchTopic = hint.topic.toLowerCase().includes(q);
        return matchTitle || matchCategory || matchTopic;
      }
      return true;
    });
  }, [hints, competitionFilter, statusFilter, searchQuery]);

  // Modal open helpers
  const handleOpenCreateModal = () => {
    setEditingHintId(null);
    setFormData(DEFAULT_FORM_DATA);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hint: CompetitionHint) => {
    setEditingHintId(hint.id);
    setFormData({
      competitionType: hint.competitionType,
      title: hint.title,
      category: hint.category,
      topic: hint.topic,
      areasToPrepare: [...hint.areasToPrepare],
      newAreaInput: '',
      preparationMessage: hint.preparationMessage,
      accessLevel: hint.accessLevel,
      status: hint.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Add area tag to form
  const handleAddArea = () => {
    if (!formData.newAreaInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      areasToPrepare: [...prev.areasToPrepare, prev.newAreaInput.trim()],
      newAreaInput: '',
    }));
  };

  const handleRemoveArea = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areasToPrepare: prev.areasToPrepare.filter((_, idx) => idx !== index),
    }));
  };

  // Save / Update hint handler
  const handleSaveHint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError('Please provide a hint title.');
      return;
    }
    if (!formData.category.trim()) {
      setFormError('Please enter a category or subject.');
      return;
    }
    if (!formData.topic.trim()) {
      setFormError('Please enter a specific topic.');
      return;
    }

    // Include any unsaved area input
    const finalAreas = [...formData.areasToPrepare];
    if (formData.newAreaInput.trim()) {
      finalAreas.push(formData.newAreaInput.trim());
    }

    if (finalAreas.length === 0) {
      setFormError('Please enter at least one area or topic for students to prepare.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingHintId) {
        // Update existing hint
        await updateCompetitionHint(editingHintId, {
          competitionType: formData.competitionType,
          title: formData.title.trim(),
          category: formData.category.trim(),
          topic: formData.topic.trim(),
          areasToPrepare: finalAreas,
          preparationMessage: formData.preparationMessage.trim(),
          accessLevel: formData.accessLevel,
          status: formData.status,
        });
        showToast('Hint updated successfully!');
      } else {
        // Create new hint
        await createCompetitionHint({
          competitionType: formData.competitionType,
          title: formData.title.trim(),
          category: formData.category.trim(),
          topic: formData.topic.trim(),
          areasToPrepare: finalAreas,
          preparationMessage: formData.preparationMessage.trim(),
          accessLevel: formData.accessLevel,
          status: formData.status,
          createdByUid: currentUser?.id,
          createdByName: currentUser?.name || 'Admin',
        });
        showToast('New hint created successfully!');
      }

      setIsModalOpen(false);
      setFormData(DEFAULT_FORM_DATA);
    } catch (err: any) {
      console.error('Failed to save hint:', err);
      setFormError(err?.message || 'Failed to save hint. Please verify your connection.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick toggle status
  const handleToggleStatus = async (hint: CompetitionHint, newStatus: HintStatus) => {
    try {
      await updateCompetitionHint(hint.id, { status: newStatus });
      showToast(`Hint status changed to ${newStatus}`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      showToast('Error changing status. Try again.');
    }
  };

  // Delete hint confirmation
  const handleConfirmDelete = async () => {
    if (!hintToDelete) return;
    setDeleteSubmitting(true);
    try {
      await deleteCompetitionHint(hintToDelete.id);
      showToast('Hint deleted permanently.');
      setHintToDelete(null);
    } catch (err) {
      console.error('Failed to delete hint:', err);
      showToast('Error deleting hint.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Competition Preparation System
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            HINT MANAGEMENT
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Create, publish, and manage strategic preparation hints for Daily Ultimate Search and School Dome competitions. Protect content for eligible subscribers.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Hint</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Hints
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Published & Active
          </span>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.published}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Daily Ultimate Search
          </span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.dailyQA}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Swords className="w-3 h-3" />
            School Dome
          </span>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
            {stats.schoolDome}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hints by title, category, or topic..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Competition Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <button
              onClick={() => setCompetitionFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                competitionFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Competitions
            </button>
            <button
              onClick={() => setCompetitionFilter('daily_qa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                competitionFilter === 'daily_qa'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>Daily Search</span>
            </button>
            <button
              onClick={() => setCompetitionFilter('school_dome')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                competitionFilter === 'school_dome'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Swords className="w-3 h-3 text-blue-500" />
              <span>School Dome</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
          >
            <option value="all">Status: All</option>
            <option value="published">Status: Published</option>
            <option value="draft">Status: Draft</option>
            <option value="hidden">Status: Hidden</option>
          </select>
        </div>
      </div>

      {/* Hints Listing */}
      {filteredHints.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <Lightbulb className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {searchQuery ? 'No matching hints found' : 'No hints created yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search or filter options.'
              : 'Click the "+ Create New Hint" button above to publish your first competition study hint.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Hint</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHints.map((hint) => {
            const isDailyQA = hint.competitionType === 'daily_qa';

            return (
              <div
                key={hint.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500/40 transition space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Competition Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        isDailyQA
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isDailyQA ? (
                        <Trophy className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Swords className="w-3 h-3 text-blue-500" />
                      )}
                      <span>{isDailyQA ? 'Daily Ultimate Search' : 'School Dome'}</span>
                    </span>

                    {/* Access Level Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        hint.accessLevel === 'vip'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                          : hint.accessLevel === 'premium'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {hint.accessLevel === 'vip'
                        ? 'VIP Only'
                        : hint.accessLevel === 'premium'
                        ? 'Premium Only'
                        : 'Premium & VIP'}
                    </span>

                    {/* Visibility Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        hint.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : hint.status === 'draft'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hint.status === 'published'
                            ? 'bg-emerald-500'
                            : hint.status === 'draft'
                            ? 'bg-slate-400'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span>{hint.status}</span>
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Quick Visibility Actions */}
                    {hint.status !== 'published' ? (
                      <button
                        onClick={() => handleToggleStatus(hint, 'published')}
                        title="Publish this hint to active subscribers"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(hint, 'hidden')}
                        title="Hide this hint from subscribers"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(hint)}
                      title="Edit hint details"
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setHintToDelete(hint)}
                      title="Delete hint"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Topic */}
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {hint.title}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Category: {hint.category}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Topic: {hint.topic}
                    </span>
                  </div>
                </div>

                {/* Areas To Prepare Preview */}
                {hint.areasToPrepare && hint.areasToPrepare.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Areas to Prepare ({hint.areasToPrepare.length}):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hint.areasToPrepare.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preparation Advice */}
                {hint.preparationMessage && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Advice:
                    </span>{' '}
                    {hint.preparationMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  {editingHintId ? 'Edit Competition Hint' : 'Create Competition Hint'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveHint} className="space-y-4">
              {/* 1. Competition Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Target Competition *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition ${
                      formData.competitionType === 'daily_qa'
                        ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="competitionType"
                      value="daily_qa"
                      checked={formData.competitionType === 'daily_qa'}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, competitionType: 'daily_qa' }))
                      }
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold">Daily Ultimate Search</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Daily challenge arena
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition ${
                      formData.competitionType === 'school_dome'
                        ? 'border-blue-500 bg-blue-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="competitionType"
                      value="school_dome"
                      checked={formData.competitionType === 'school_dome'}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, competitionType: 'school_dome' }))
                      }
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Swords className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold">School Dome</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Institutional arena
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Hint Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hint Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Nigerian Independence & Leaders"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              {/* 3. Category & Topic (Two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Main Category / Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Nigerian History, Biology, Physics"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Specific Topic *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g. Nigerian Independence (1960)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* 4. Areas to Prepare (Multi-tag input) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Areas Students Should Prepare *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Press Enter or click Add
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.newAreaInput}
                    onChange={(e) => setFormData({ ...formData, newAreaInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddArea();
                      }
                    }}
                    placeholder="e.g. Important historical dates, Nigerian leaders"
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddArea}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Add Area
                  </button>
                </div>

                {formData.areasToPrepare.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formData.areasToPrepare.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 text-xs font-medium flex items-center gap-1.5"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveArea(idx)}
                          className="hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Additional Preparation Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Additional Preparation Message
                </label>
                <textarea
                  rows={3}
                  value={formData.preparationMessage}
                  onChange={(e) => setFormData({ ...formData, preparationMessage: e.target.value })}
                  placeholder="e.g. Prepare well and understand the important events surrounding Nigerian independence."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* 6. Subscription Access Tier & Visibility (Two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subscription Access Level *
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, accessLevel: e.target.value as HintSubscriptionTier })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="both">Premium and VIP (Recommended)</option>
                    <option value="premium">Premium Only</option>
                    <option value="vip">VIP Only</option>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Free users are always locked out of protected details.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Visibility Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as HintStatus })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="published">Published / Visible to Subscribers</option>
                    <option value="draft">Draft (Saved, Not Visible)</option>
                    <option value="hidden">Hidden / Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {formSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingHintId ? 'Save Changes' : 'Publish Hint'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {hintToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Competition Hint?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  "{hintToDelete.title}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setHintToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Hint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
