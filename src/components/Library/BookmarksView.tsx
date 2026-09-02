import React from 'react';
import { motion } from 'motion/react';
import { Bookmark, Eye, BookOpen } from 'lucide-react';
import { PastQuestion } from '../../types';
import { PastQuestionCard } from './PastQuestionCard';

interface BookmarksViewProps {
  bookmarkedQuestions: PastQuestion[];
  onView: (question: PastQuestion) => void;
  onToggleBookmark: (questionId: string) => void;
  onBrowseAll: () => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarkedQuestions,
  onView,
  onToggleBookmark,
  onBrowseAll,
}) => {
  if (bookmarkedQuestions.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-3">
          <Bookmark className="w-6 h-6 fill-amber-400" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Saved Past Questions Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Bookmark questions while browsing the library to build your personal examination revision vault!
        </p>
        <button
          onClick={onBrowseAll}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
        >
          <BookOpen className="w-4 h-4" />
          Browse Academic Past Questions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Showing <strong className="text-slate-900 dark:text-slate-100">{bookmarkedQuestions.length}</strong> saved past question{bookmarkedQuestions.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookmarkedQuestions.map((q) => (
          <PastQuestionCard
            key={q.id}
            question={q}
            isBookmarked={true}
            onView={onView}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </div>
    </div>
  );
};

