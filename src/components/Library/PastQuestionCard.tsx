import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Eye,
  Bookmark,
  CheckCircle2,
  Clock,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Crown,
} from 'lucide-react';
import { PastQuestion } from '../../types';

interface PastQuestionCardProps {
  question: PastQuestion;
  isBookmarked: boolean;
  onView: (question: PastQuestion) => void;
  onToggleBookmark: (questionId: string) => void;
  isViewDisabled?: boolean;
  isAlreadyViewedToday?: boolean;
  userTier?: 'free' | 'premium' | 'vip';
  onUpgradePrompt?: () => void;
}

export const PastQuestionCard: React.FC<PastQuestionCardProps> = ({
  question,
  isBookmarked,
  onView,
  onToggleBookmark,
  isViewDisabled = false,
  isAlreadyViewedToday = false,
  userTier = 'free',
  onUpgradePrompt,
}) => {
  const isPending = question.status === 'pending';
  const isRejected = question.status === 'rejected';

  // If daily limit is reached and this question was not already unlocked today, lock the view button
  const isLocked = isViewDisabled && !isAlreadyViewedToday;

  // Category badge styling with light & dark modes
  const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
    University: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    Polytechnic: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    'College of Education': {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    'College of Health & Nursing': {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
    },
    'Specialized Institute': {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
    },
  };

  const catStyle = categoryColorMap[question.institutionCategory] || {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      id={`pq-card-${question.id}`}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* Top institution & status header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            <Building className="w-3 h-3" />
            {question.institutionCategory}
          </span>

          <div className="flex items-center gap-1.5">
            {question.status === 'approved' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Verified
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Pending Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Rejected
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(question.id);
              }}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Past Question'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Institution Name */}
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mb-1.5" title={question.institutionName}>
          {question.institutionName}
        </p>

        {/* Course Code & Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {question.courseCode}
        </h3>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5 min-h-[40px]" title={question.courseTitle}>
          {question.courseTitle}
        </p>

        {/* Metadata Chips */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{question.academicSession}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{question.semester}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{question.level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">
              {question.pagesCount || 1} {question.pagesCount === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
        </div>

        {/* Department / Faculty subtext */}
        <div className="mt-2.5 pt-2 border-t border-slate-100/70 dark:border-slate-800/80">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{question.departmentName}</span>
          </p>
        </div>
      </div>

      {/* Footer view action */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1" title="Views count">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            {question.viewsCount || 0}
          </span>
          {question.gpAwarded ? (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]" title="GP Reward Credited">
              <Sparkles className="w-3 h-3 text-amber-500" />
              +{question.gpAwarded} GP
            </span>
          ) : null}
        </div>

        {isLocked ? (
          <button
            onClick={() => {
              if (onUpgradePrompt) {
                onUpgradePrompt();
              } else {
                onView(question);
              }
            }}
            id={`view-btn-${question.id}`}
            title="Daily viewing limit reached. Upgrade to unlock unlimited past questions."
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Limit Reached • Upgrade</span>
          </button>
        ) : (
          <button
            onClick={() => onView(question)}
            id={`view-btn-${question.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isAlreadyViewedToday ? 'View (Unlocked)' : 'View Question'}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
