import React from 'react';
import {
  Swords,
  Trophy,
  Lock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Award,
  X,
  Shield,
  Sparkles,
} from 'lucide-react';
import { SchoolDomeSeason } from '../../types';

interface SchoolDomeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: SchoolDomeSeason | null;
}

export const SchoolDomeRulesModal: React.FC<SchoolDomeRulesModalProps> = ({
  isOpen,
  onClose,
  season,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>School Dome Arena Rules</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official tournament guidelines & elimination protocols
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Rule 1: Registration Window & Permanent Lock */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                1. Free Open Registration & Permanent Lock
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Registration is completely free to all scholars before Question #1 is launched. <strong>The moment the Arbiter launches Question #1, registration is permanently locked</strong> for the remainder of the season. No new entrants are admitted.
              </p>
            </div>
          </div>

          {/* Rule 2: Single Attempt Elimination */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl shrink-0 mt-0.5">
              <XCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                2. One Attempt Per Question
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Each active scholar receives exactly <strong>one attempt</strong> to answer each challenge question. Submitting an incorrect answer or failing to reply before time expires results in immediate elimination from the season.
              </p>
            </div>
          </div>

          {/* Rule 3: Survival Advancement */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                3. Survival & Advancement
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Scholars who supply the correct answer within the countdown timer survive the challenge and advance as the <strong>Last Scholars Standing</strong>.
              </p>
            </div>
          </div>

          {/* Rule 4: Equal Prize Split */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5 font-black">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-950 dark:text-amber-300">
                4. Equal Prize Pool Split
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                There are no partial rewards. The entire season prize pool ({season ? `${season.prizeCurrency === 'NGN' ? '₦' : ''}${season.prizePool.toLocaleString()} ${season.prizeCurrency === 'GP' ? 'GP' : ''}` : '₦50,000'}) is <strong>divided equally</strong> among all surviving scholars standing when the season reaches its finale!
              </p>
            </div>
          </div>

          {/* Rule 5: Spectator Mode */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-500 rounded-xl shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                5. Full Open Spectator Mode
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Anyone on Grobaax can spectate School Dome live! Unregistered users and eliminated scholars can cheer, react with emojis, and discuss the answers without affecting competition scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition hover:scale-105 active:scale-95"
          >
            I Understand the Rules
          </button>
        </div>
      </div>
    </div>
  );
};
