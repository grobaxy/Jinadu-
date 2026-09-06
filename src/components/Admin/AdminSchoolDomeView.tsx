import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SchoolDomeSeason,
  SchoolDomeQuestion,
  SchoolDomeMessage,
} from '../../types';
import {
  subscribeSchoolDomeActiveSeason,
  subscribeSchoolDomeActiveQuestion,
  subscribeSchoolDomeQuestions,
  subscribeSchoolDomeMessages,
  deleteSchoolDomeMessage,
  closeSchoolDomeQuestion,
  extendSchoolDomeQuestionTime,
  endSchoolDomeSeasonAndDistributePrize,
} from '../../lib/schoolDomeService';
import { CreateSchoolDomeQuestionModal } from '../SchoolDome/CreateSchoolDomeQuestionModal';
import { SchoolDomeAdminSeasonModal } from '../SchoolDome/SchoolDomeAdminSeasonModal';
import {
  Swords,
  CheckCircle2,
  Settings,
  Play,
  Square,
} from 'lucide-react';

export const AdminSchoolDomeView: React.FC = () => {
  const { currentUser } = useApp();

  const [currentSeason, setCurrentSeason] = useState<SchoolDomeSeason | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<SchoolDomeQuestion | null>(null);
  const [questions, setQuestions] = useState<SchoolDomeQuestion[]>([]);
  const [messages, setMessages] = useState<SchoolDomeMessage[]>([]);

  const [isCreateQModalOpen, setIsCreateQModalOpen] = useState(false);
  const [isAdminSeasonModalOpen, setIsAdminSeasonModalOpen] = useState(false);
  const [seasonModalInitialTab, setSeasonModalInitialTab] = useState<'manage' | 'new_season'>('manage');
  const [isEndingSeason, setIsEndingSeason] = useState(false);

  useEffect(() => {
    const unsub = subscribeSchoolDomeActiveSeason((s) => {
      setCurrentSeason(s);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentSeason?.id) return;
    const unsubQ = subscribeSchoolDomeActiveQuestion(currentSeason.id, (q) => {
      setActiveQuestion(q);
    });
    const unsubAllQ = subscribeSchoolDomeQuestions(currentSeason.id, (list) => {
      setQuestions(list);
    });
    const unsubMsg = subscribeSchoolDomeMessages(currentSeason.id, (msgs) => {
      setMessages(msgs);
    });
    return () => {
      unsubQ();
      unsubAllQ();
      unsubMsg();
    };
  }, [currentSeason?.id]);

  const standingCount = currentSeason?.activeUserIds?.length || 0;
  const registeredCount = currentSeason?.registeredUserIds?.length || 0;
  const prizePool = currentSeason?.prizePool || 50000;
  const currency = currentSeason?.prizeCurrency || 'NGN';
  const prizePrefix = currency === 'NGN' ? '₦' : '';
  const prizeSuffix = currency === 'GP' ? ' GP' : '';
  const prizePerWinner = Math.floor(prizePool / Math.max(1, standingCount));

  const handleStartSeasonClick = () => {
    setSeasonModalInitialTab('new_season');
    setIsAdminSeasonModalOpen(true);
  };

  const handleDirectEndSeason = async () => {
    if (!currentSeason) return;
    if (currentSeason.status === 'ended') {
      alert('This season has already concluded.');
      return;
    }
    const count = currentSeason.activeUserIds?.length || 0;
    const confirmMsg = `Are you sure you want to END ${currentSeason.title}?\n\n• Prize Pool: ${prizePrefix}${prizePool.toLocaleString()}${prizeSuffix}\n• Last People Standing: ${count} scholars\n• Equal Share: ${prizePrefix}${prizePerWinner.toLocaleString()}${prizeSuffix} each\n\nAll last scholars standing will have their prize credited directly to their GROBAAX wallets immediately.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsEndingSeason(true);
      const res = await endSchoolDomeSeasonAndDistributePrize(currentSeason.id, currentUser.id, currentUser.name);
      alert(`Season #${currentSeason.seasonNumber} concluded successfully!\n${res.winners.length} winner(s) received ${prizePrefix}${res.prizePerWinner.toLocaleString()}${prizeSuffix} credited directly to their GROBAAX wallets.`);
    } catch (err: any) {
      alert(`Failed to end season: ${err?.message || err}`);
    } finally {
      setIsEndingSeason(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                School Dome Arena Administration
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Official Arbiter Console
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage elimination questions, season lifecycle, registration locks, and equal prize pool distribution
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {currentSeason && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* START SEASON Button */}
            <button
              type="button"
              onClick={handleStartSeasonClick}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Start a new competition season, set prize pool & rules, and open registration"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START SEASON</span>
            </button>

            {/* END SEASON Button */}
            <button
              type="button"
              disabled={isEndingSeason || currentSeason.status === 'ended'}
              onClick={handleDirectEndSeason}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="End the season, find last scholars standing, and split prize pool equally into Grobaax wallets"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{isEndingSeason ? 'SPLITTING PRIZE...' : 'END SEASON'}</span>
            </button>

            {/* Yellow Q Launch Question Button */}
            <button
              type="button"
              onClick={() => setIsCreateQModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Launch elimination question for Free, Premium, or VIP contenders with specific time limit"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[10px]">
                Q
              </span>
              <span>Launch Question (Yellow Q)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeasonModalInitialTab('manage');
                setIsAdminSeasonModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>

      {currentSeason ? (
        <div className="space-y-4">
          {/* Active Question Banner if Live */}
          {activeQuestion && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-amber-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    ACTIVE QUESTION #{activeQuestion.questionNumber} IN PROGRESS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => extendSchoolDomeQuestionTime(activeQuestion.id, 60)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    +60s Time
                  </button>
                  <button
                    type="button"
                    onClick={() => closeSchoolDomeQuestion(currentSeason.id, activeQuestion.id)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    End Question
                  </button>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-black text-white">
                « {activeQuestion.questionText} »
              </h3>

              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Answer: {activeQuestion.correctAnswer}
                </span>
                <span>•</span>
                <span>{activeQuestion.survivorUserIds?.length || 0} Survived so far</span>
                <span>•</span>
                <span>{activeQuestion.eliminatedUserIds?.length || 0} Knocked out</span>
              </div>
            </div>
          )}

          {/* Clean Focused Season Status Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-500 dark:text-slate-400">Current Season:</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                Season #{currentSeason.seasonNumber} — {currentSeason.title}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                currentSeason.status === 'ended'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
              }`}>
                {currentSeason.status === 'ended' ? 'Concluded' : 'Active'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600 dark:text-slate-300 font-semibold">
              <span>Prize Pool: <strong className="text-amber-500 font-black">{prizePrefix}{prizePool.toLocaleString()}{prizeSuffix}</strong></span>
              <span>Registered: <strong className="text-slate-900 dark:text-white font-black">{registeredCount}</strong></span>
              <span>Standing: <strong className="text-emerald-500 font-black">{standingCount}</strong></span>
              <span>Registration: <strong className={currentSeason.isRegistrationLocked ? 'text-amber-500 font-black' : 'text-emerald-500 font-black'}>{currentSeason.isRegistrationLocked ? 'Locked' : 'Open'}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading School Dome Arena data...
        </div>
      )}

      {/* Modals */}
      {currentSeason && (
        <>
          <CreateSchoolDomeQuestionModal
            isOpen={isCreateQModalOpen}
            onClose={() => setIsCreateQModalOpen(false)}
            season={currentSeason}
            adminUid={currentUser?.id}
            adminName={currentUser?.name}
            onQuestionCreated={(q) => {
              setActiveQuestion(q);
            }}
          />

          <SchoolDomeAdminSeasonModal
            isOpen={isAdminSeasonModalOpen}
            onClose={() => setIsAdminSeasonModalOpen(false)}
            season={currentSeason}
            adminUid={currentUser?.id}
            adminName={currentUser?.name}
            initialTab={seasonModalInitialTab}
          />
        </>
      )}
    </div>
  );
};
