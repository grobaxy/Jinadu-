import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Eye,
  Calendar,
  Layers,
  GraduationCap,
  Building,
} from 'lucide-react';
import { PastQuestion, PastQuestionStatus } from '../../types';

interface MyContributionsViewProps {
  contributions: PastQuestion[];
  onView: (question: PastQuestion) => void;
  onOpenUpload: () => void;
  canUploadToday?: boolean;
  remainingUploads?: number;
}

export const MyContributionsView: React.FC<MyContributionsViewProps> = ({
  contributions,
  onView,
  onOpenUpload,
  canUploadToday = true,
  remainingUploads = 1,
}) => {
  const [filterStatus, setFilterStatus] = useState<PastQuestionStatus | 'all'>('all');

  const approvedList = contributions.filter((c) => c.status === 'approved');
  const pendingList = contributions.filter((c) => c.status === 'pending');
  const rejectedList = contributions.filter((c) => c.status === 'rejected');

  const totalGpEarned = approvedList.reduce((acc, c) => acc + (c.gpAwarded || 50), 0);

  const displayedList = filterStatus === 'all'
    ? contributions
    : contributions.filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Uploads</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{contributions.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Approved & Verified</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{approvedList.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Pending Review</p>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{pendingList.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">GP Earned</p>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1">+{totalGpEarned} GP</p>
        </div>
      </div>

      {/* Action and Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({contributions.length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Approved ({approvedList.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Pending ({pendingList.length})
          </button>
          {rejectedList.length > 0 && (
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'rejected'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Rejected ({rejectedList.length})
            </button>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          Upload New Question ({remainingUploads} remaining this week)
        </button>
      </div>

      {/* Contributions List */}
      {displayedList.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
          <UploadCloud className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No past questions in this category</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Share examination questions from your department to help fellow students and earn +50 GP per approved contribution!
          </p>
          <button
            onClick={onOpenUpload}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Past Question
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedList.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Header Status & Session */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {item.institutionCategory}
                  </span>

                  {item.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Approved (+{item.gpAwarded || 50} GP)
                    </span>
                  ) : item.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Pending Moderation
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      Rejected
                    </span>
                  )}
                </div>

                {/* Course Code & Title */}
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.courseCode}</h4>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{item.courseTitle}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.institutionName}</p>

                {/* Academic Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.academicSession}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.semester}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.viewsCount || 0} views</span>
                  </div>
                </div>

                {/* Rejection notice if any */}
                {item.status === 'rejected' && item.rejectionReason && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200">
                    <strong>Moderator Feedback:</strong> {item.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Submitted {new Date(item.uploadedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onView(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

