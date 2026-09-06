import React, { useState } from 'react';
import {
  HelpCircle,
  Trophy,
  Users,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { createSchoolDomeQuestion } from '../../lib/schoolDomeService';
import { SchoolDomeQuestion, SchoolDomeSeason } from '../../types';

interface CreateSchoolDomeQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: SchoolDomeSeason | null;
  adminUid?: string;
  adminName?: string;
  defaultWinnerCount?: number;
  defaultGpReward?: number;
  defaultTimeLimitSeconds?: number;
  onQuestionCreated?: (question: SchoolDomeQuestion) => void;
}

export const CreateSchoolDomeQuestionModal: React.FC<CreateSchoolDomeQuestionModalProps> = ({
  isOpen,
  onClose,
  season,
  adminUid,
  adminName,
  defaultWinnerCount = 1,
  defaultGpReward = 500,
  defaultTimeLimitSeconds = 300,
  onQuestionCreated,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [alternativeAnswers, setAlternativeAnswers] = useState('');
  const [targetTier, setTargetTier] = useState<'free' | 'premium' | 'vip'>('free');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(defaultTimeLimitSeconds || 120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setErrorMsg('Please enter a valid question.');
      return;
    }
    if (!correctAnswer.trim()) {
      setErrorMsg('Please specify the official correct answer.');
      return;
    }
    if (timeLimitSeconds < 15) {
      setErrorMsg('Time limit must be at least 15 seconds.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const altArray = alternativeAnswers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const seasonId = season?.id || 'season_dome_1';

      const createdQ = await createSchoolDomeQuestion(
        seasonId,
        {
          questionText: questionText.trim(),
          correctAnswer: correctAnswer.trim(),
          acceptedAlternativeAnswers: altArray,
          timeLimitSeconds: Number(timeLimitSeconds),
          targetTier,
        },
        adminUid,
        adminName
      );

      if (onQuestionCreated) {
        onQuestionCreated(createdQ);
      }

      setQuestionText('');
      setCorrectAnswer('');
      setAlternativeAnswers('');
      onClose();
    } catch (err: any) {
      console.error('Error creating School Dome question:', err);
      setErrorMsg(err?.message || 'Failed to post live question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header matching Daily Ultimate Search */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              Q
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Post Live Q&A Challenge</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] uppercase font-bold tracking-wider border border-amber-400/30">
                  Instant Rewards
                </span>
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                First scholars to type the exact answer in live chat win instant GP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Question Text / Challenge</span>
            </label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="e.g. What is 13 × 7?"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Correct Answer */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Official Correct Answer</span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal italic">
                (Hidden from scholars until round ends)
              </span>
            </label>
            <input
              required
              type="text"
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              placeholder="e.g. 91"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Alternative Answers */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Alternative Accepted Spellings / Answers (Optional, comma-separated)
            </label>
            <input
              type="text"
              value={alternativeAnswers}
              onChange={e => setAlternativeAnswers(e.target.value)}
              placeholder="e.g. Ninety one, ninety-one, 91"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Target Contender Tier Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Eligibility / Target Tier</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Who can answer this question
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetTier('free')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  targetTier === 'free'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>FREE</span>
                <span className="text-[10px] font-normal opacity-80">All Contenders</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetTier('premium')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  targetTier === 'premium'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>PREMIUM</span>
                <span className="text-[10px] font-normal opacity-80">Premium & VIP</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetTier('vip')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  targetTier === 'vip'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-400 ring-2 ring-purple-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>VIP</span>
                <span className="text-[10px] font-normal opacity-80">VIP Only</span>
              </button>
            </div>
          </div>

          {/* Time Limit Setting */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Time Limit for Answers</span>
              </span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                {timeLimitSeconds} seconds ({Math.floor(timeLimitSeconds / 60)}m {timeLimitSeconds % 60}s)
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[30, 60, 90, 120, 180, 300, 600].map(secs => (
                <button
                  key={secs}
                  type="button"
                  onClick={() => setTimeLimitSeconds(secs)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    timeLimitSeconds === secs
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                </button>
              ))}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <input
                type="number"
                min={15}
                max={3600}
                step={5}
                value={timeLimitSeconds}
                onChange={e => setTimeLimitSeconds(Math.max(15, Number(e.target.value)))}
                className="w-28 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">custom seconds</span>
            </div>
          </div>

          {/* Rule Note */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong>Elimination Rules:</strong> Contenders must answer correctly before the {timeLimitSeconds}s timer expires to survive. Wrong answer or no answer = eliminated. Last standing split the {season?.prizePool ? season.prizePool.toLocaleString() : '50,000'} GP prize pool!
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !questionText.trim() || !correctAnswer.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 hover:from-blue-800 hover:to-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Posting Question...</span>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Launch Live Challenge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
