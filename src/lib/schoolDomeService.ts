import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SchoolDomeSeason,
  SchoolDomeQuestion,
  SchoolDomeMessage,
  SchoolDomeParticipant,
  SchoolDomeWinner,
  UserProfile,
  PRIMARY_SUPER_ADMIN_UID,
} from '../types';
import { grobaxNotificationService } from './notificationService';

// Completed Season 1 (Permanent Historical Record)
export const COMPLETED_SEASON_1: SchoolDomeSeason = {
  id: 'season_dome_1',
  seasonNumber: 1,
  title: 'Season 1',
  description: 'Inter-Campus Elimination Arena Season 1',
  prizePool: 30000,
  prizeCurrency: 'GP',
  status: 'ended',
  registeredUserIds: ['user_john_1', 'user_mary_2', 'user_david_3'],
  activeUserIds: ['user_john_1', 'user_mary_2', 'user_david_3'],
  eliminatedUserIds: [],
  isRegistrationLocked: true,
  firstQuestionLaunched: true,
  currentQuestionNumber: 10,
  totalQuestionsLaunched: 10,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  startedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  endedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  winners: [
    {
      userId: 'user_john_1',
      userName: 'John',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      institution: 'University of Lagos',
      prizeWon: 10000,
    },
    {
      userId: 'user_mary_2',
      userName: 'Mary',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      institution: 'Federal polytechnic ilaro',
      prizeWon: 10000,
    },
    {
      userId: 'user_david_3',
      userName: 'David',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      institution: 'Adekunle college of education',
      prizeWon: 10000,
    },
  ],
};

// Default initial live season for School Dome (Season 2)
export const DEFAULT_INITIAL_SEASON: SchoolDomeSeason = {
  id: 'season_dome_2',
  seasonNumber: 2,
  title: 'Season 2',
  description: 'The Ultimate Inter-Campus Elimination Arena. Answer correctly to survive each question. The prize pool is divided equally among the last scholars standing!',
  prizePool: 50000,
  prizeCurrency: 'GP',
  status: 'active',
  registeredUserIds: ['user_futo_1', 'user_unilag_2', 'user_oau_3', 'user_ui_4', 'user_abu_5'],
  activeUserIds: ['user_futo_1', 'user_unilag_2', 'user_oau_3', 'user_ui_4', 'user_abu_5'],
  eliminatedUserIds: [],
  isRegistrationLocked: true,
  firstQuestionLaunched: true,
  currentQuestionNumber: 1,
  totalQuestionsLaunched: 1,
  createdAt: Date.now() - 1000 * 60 * 30,
  startedAt: Date.now() - 1000 * 60 * 25,
  rules: [
    'Registration is completely free and open to all verified scholars before Question #1 begins.',
    'Once Question #1 is launched by the Arbiter, registration is permanently locked for the season.',
    'Each scholar receives exactly ONE attempt per live question challenge.',
    'Submitting the correct answer within the time limit secures advancement to the next question.',
    'Failing to answer or submitting an incorrect answer results in immediate elimination.',
    'The entire GP prize pool is divided equally among the Last Scholars Standing when the season concludes.',
  ],
};

export const DEFAULT_INITIAL_QUESTION: SchoolDomeQuestion = {
  id: 'dome_q_13',
  seasonId: 'season_dome_1',
  questionNumber: 13,
  questionText: 'What is 13 × 7?',
  correctAnswer: '91',
  acceptedAlternativeAnswers: ['91', 'Ninety one', 'ninety-one'],
  timeLimitSeconds: 600,
  startAt: Date.now() - 1000 * 60 * 2,
  endAt: Date.now() + 1000 * 60 * 8, // 8 mins remaining
  status: 'active',
  survivorUserIds: ['user_lawal_1'],
  eliminatedUserIds: [],
  totalSubmissionsCount: 1,
  repliedUserIds: ['user_lawal_1'],
  repliedUsernames: ['Lawal Faizah'],
  createdAt: Date.now() - 1000 * 60 * 2,
  createdByUid: PRIMARY_SUPER_ADMIN_UID,
  createdByName: 'Grobaxy Limited 🛡️',
};

export const DEFAULT_INITIAL_MESSAGES: SchoolDomeMessage[] = [
  {
    id: 'dome_msg_welcome',
    seasonId: 'season_dome_1',
    userId: 'grobax_arbiter',
    userName: 'School Dome Arbiter 🛡️',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    institution: 'Grobaax Arena HQ',
    department: 'Chief Arbiter',
    level: 'Master',
    isPremium: true,
    isVip: true,
    messageText: '🏛️ Welcome to School Dome!\n\nReal-time competitive academic arena. Live challenges and discussions appear instantly for all scholars across campuses.',
    timestamp: Date.now() - 1000 * 60 * 25,
    type: 'announcement',
    reactions: { '🔥': 14, '⚡': 9 },
  },
  {
    id: 'dome_msg_q_13',
    seasonId: 'season_dome_1',
    userId: PRIMARY_SUPER_ADMIN_UID,
    userName: 'Grobaxy Limited 🛡️',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    institution: 'Grobaax Arena HQ',
    department: 'Chief Moderator',
    level: 'Master',
    isPremium: true,
    isVip: true,
    messageText: 'What is 13 × 7?',
    timestamp: Date.now() - 1000 * 60 * 12,
    type: 'question',
    competitionRef: {
      competitionId: 'school_dome',
      questionId: 'dome_q_13',
      questionNumber: 13,
      totalQuestions: 20,
      questionText: 'What is 13 × 7?',
      status: 'active',
      gpRewardPerWinner: 500,
      winnerCountLimit: 1,
      allowFreeParticipation: true,
      timeLimitSeconds: 600,
      startAt: Date.now() - 1000 * 60 * 2,
      endAt: Date.now() + 1000 * 60 * 8,
      repliedUserIds: ['user_lawal_1'],
    },
    reactions: { '⚡': 1, '🎯': 1 },
  },
  {
    id: 'dome_msg_claim_13',
    seasonId: 'season_dome_1',
    userId: 'grobax_arbiter',
    userName: 'School Dome Arbiter 🛡️',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    institution: 'Grobaax Arena HQ',
    department: 'Chief Arbiter',
    level: 'Master',
    isPremium: true,
    isVip: true,
    messageText: '🏆 All 1 winner slots for Question #13 have been claimed! ✅ Official Correct Answer: "91" 👑 Winners: @Lawal Faizah (+500 GP)',
    timestamp: Date.now() - 1000 * 60 * 10,
    type: 'announcement',
    reactions: { '👏': 4, '🏆': 3 },
  },
  {
    id: 'dome_msg_user_1',
    seasonId: 'season_dome_1',
    userId: 'user_abdul_1',
    userName: 'Abdulgaffar',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    institution: 'Yaba College of Technology',
    department: 'Electrical Eng',
    level: 'HND2',
    isPremium: true,
    messageText: 'Morning to us. Is there any Questions opened this morning?',
    timestamp: Date.now() - 1000 * 60 * 5,
    type: 'normal',
    reactions: { '❤️': 1 },
  },
  {
    id: 'dome_msg_user_2',
    seasonId: 'season_dome_1',
    userId: 'user_lawal_1',
    userName: 'Lawal Faizah',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    institution: 'Lagos State University of Education, Ijanikin',
    department: 'Science Education (Mathematics)',
    level: '300L',
    isPremium: true,
    isVip: true,
    messageText: '91',
    timestamp: Date.now() - 1000 * 60 * 3,
    type: 'normal',
    replyTo: {
      id: 'dome_msg_q_13',
      userName: 'Grobaxy Limited 🛡️',
      messageSnippet: 'What is 13 × 7?',
      institution: 'Grobaax Arena HQ',
    },
    reactions: { '👏': 2, '🔥': 1 },
  },
  {
    id: 'dome_msg_user_3',
    seasonId: 'season_dome_1',
    userId: 'user_okunola_1',
    userName: 'Okunola',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    institution: 'Kwara State Polytechnic',
    department: 'Computer Science',
    level: 'ND2',
    isPremium: false,
    messageText: 'We wait for the next challenge!',
    timestamp: Date.now() - 1000 * 60 * 1,
    type: 'normal',
    reactions: { '🔥': 2 },
  },
];

// Past completed season sample for Results/Winners Tab
export const PAST_COMPLETED_SEASONS_MOCK: SchoolDomeSeason[] = [
  {
    id: 'season_dome_pre_alpha',
    seasonNumber: 0,
    title: 'School Dome — Inaugural Exhibition Season',
    description: 'The inaugural exhibition clash featuring top university scholars nationwide.',
    prizePool: 30000,
    prizeCurrency: 'NGN',
    status: 'ended',
    registeredUserIds: ['user_unilag_1', 'user_ui_2', 'user_unn_3'],
    activeUserIds: ['user_unilag_1', 'user_unn_3'],
    eliminatedUserIds: ['user_ui_2'],
    isRegistrationLocked: true,
    firstQuestionLaunched: true,
    currentQuestionNumber: 5,
    totalQuestionsLaunched: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    startedAt: Date.now() - 1000 * 60 * 60 * 46,
    endedAt: Date.now() - 1000 * 60 * 60 * 44,
    winners: [
      {
        userId: 'user_unilag_1',
        userName: 'Amina Bello',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        institution: 'University of Lagos',
        department: 'Computer Science',
        prizeWon: 15000,
      },
      {
        userId: 'user_unn_3',
        userName: 'David Eze',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        institution: 'University of Nigeria, Nsukka',
        department: 'Mechanical Engineering',
        prizeWon: 15000,
      },
    ],
  },
];

// Helper to normalize and check answers
export function isAnswerCorrect(
  userAnswer: string,
  officialAnswer: string,
  alternatives?: string[]
): boolean {
  const cleanUser = userAnswer.trim().toLowerCase().replace(/^[#@!.]+|[#@!.]+$/g, '');
  const cleanOfficial = officialAnswer.trim().toLowerCase();
  if (cleanUser === cleanOfficial) return true;

  if (alternatives && alternatives.length > 0) {
    for (const alt of alternatives) {
      const cleanAlt = alt.trim().toLowerCase();
      if (cleanUser === cleanAlt) return true;
    }
  }
  return false;
}

// Subscribe to latest/active season
export function subscribeSchoolDomeActiveSeason(
  callback: (season: SchoolDomeSeason) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_seasons'),
      orderBy('seasonNumber', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as SchoolDomeSeason;
          callback({ ...docData, id: snapshot.docs[0].id });
        } else {
          // Initialize default season in Firestore if non-existent
          setDoc(doc(db, 'school_dome_seasons', DEFAULT_INITIAL_SEASON.id), DEFAULT_INITIAL_SEASON).catch(
            () => {}
          );
          callback(DEFAULT_INITIAL_SEASON);
        }
      },
      (err) => {
        console.warn('School Dome active season snapshot notice:', err);
        callback(DEFAULT_INITIAL_SEASON);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('School Dome active season subscription failed:', err);
    callback(DEFAULT_INITIAL_SEASON);
    return () => {};
  }
}

// Subscribe to all seasons (for Results / Winners tab)
export function subscribeSchoolDomeSeasons(
  callback: (seasons: SchoolDomeSeason[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_seasons'),
      orderBy('seasonNumber', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let list: SchoolDomeSeason[] = [];
        if (!snapshot.empty) {
          list = snapshot.docs.map(d => ({
            ...(d.data() as SchoolDomeSeason),
            id: d.id,
          }));
        }

        // Ensure permanent Season 1 completed result is always preserved
        const hasSeason1 = list.some(s => s.seasonNumber === 1 && s.status === 'ended');
        if (!hasSeason1) {
          list.push(COMPLETED_SEASON_1);
          setDoc(doc(db, 'school_dome_seasons', COMPLETED_SEASON_1.id), COMPLETED_SEASON_1).catch(() => {});
        }

        // Order descending: latest seasons first, Season 1 permanently included
        list.sort((a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0));
        callback(list);
      },
      (err) => {
        console.warn('School Dome seasons snapshot notice:', err);
        callback([DEFAULT_INITIAL_SEASON, COMPLETED_SEASON_1]);
      }
    );

    return unsubscribe;
  } catch {
    callback([DEFAULT_INITIAL_SEASON, COMPLETED_SEASON_1]);
    return () => {};
  }
}

// Subscribe to live messages
export function subscribeSchoolDomeMessages(
  seasonId: string,
  callback: (messages: SchoolDomeMessage[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_messages'),
      orderBy('timestamp', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const msgs = snapshot.docs
            .map(d => ({ ...(d.data() as SchoolDomeMessage), id: d.id }))
            .filter(m => !m.isDeleted);
          callback(msgs);
        } else {
          // Seed default messages if empty
          const batch = writeBatch(db);
          DEFAULT_INITIAL_MESSAGES.forEach((m) => {
            batch.set(doc(db, 'school_dome_messages', m.id), m);
          });
          batch.commit().catch(() => {});
          callback(DEFAULT_INITIAL_MESSAGES);
        }
      },
      (err) => {
        console.warn('School Dome messages snapshot notice:', err);
        callback(DEFAULT_INITIAL_MESSAGES);
      }
    );

    return unsubscribe;
  } catch {
    callback(DEFAULT_INITIAL_MESSAGES);
    return () => {};
  }
}

// Subscribe to active question
export function subscribeSchoolDomeActiveQuestion(
  seasonId: string,
  callback: (question: SchoolDomeQuestion | null) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_questions'),
      where('seasonId', '==', seasonId),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const qData = snapshot.docs[0].data() as SchoolDomeQuestion;
          callback({ ...qData, id: snapshot.docs[0].id });
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('School Dome active question snapshot notice:', err);
        callback(DEFAULT_INITIAL_QUESTION);
      }
    );

    return unsubscribe;
  } catch {
    callback(DEFAULT_INITIAL_QUESTION);
    return () => {};
  }
}

// Subscribe to all questions of a season (for archive/results)
export function subscribeSchoolDomeQuestions(
  seasonId: string,
  callback: (questions: SchoolDomeQuestion[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_questions'),
      where('seasonId', '==', seasonId),
      orderBy('questionNumber', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({
            ...(d.data() as SchoolDomeQuestion),
            id: d.id,
          }));
          callback(list);
        } else {
          callback([DEFAULT_INITIAL_QUESTION]);
        }
      },
      () => {
        callback([DEFAULT_INITIAL_QUESTION]);
      }
    );

    return unsubscribe;
  } catch {
    callback([DEFAULT_INITIAL_QUESTION]);
    return () => {};
  }
}

// Register user for current season (only allowed before first question)
export async function registerUserForSchoolDome(
  seasonId: string,
  user: UserProfile
): Promise<{ success: boolean; message: string }> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);

    if (!seasonSnap.exists()) {
      return { success: false, message: 'Season not found.' };
    }

    const seasonData = seasonSnap.data() as SchoolDomeSeason;

    // RULE: Registration locks permanently once first question is launched
    if (seasonData.isRegistrationLocked || seasonData.firstQuestionLaunched) {
      return {
        success: false,
        message: 'Registration is permanently locked for this season because the first question has already launched.',
      };
    }

    if (seasonData.status === 'ended') {
      return { success: false, message: 'This season has already concluded.' };
    }

    const regList = seasonData.registeredUserIds || [];
    if (regList.includes(user.id)) {
      return { success: true, message: 'You are already registered for this season!' };
    }

    // Add participant
    const partRef = doc(db, 'school_dome_registrations', `${seasonId}_${user.id}`);
    const participant: SchoolDomeParticipant = {
      id: `${seasonId}_${user.id}`,
      seasonId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      institution: user.institution,
      department: user.department,
      level: user.level,
      isPremium: Boolean(user.isPremium || user.isVip),
      status: 'active',
      registeredAt: Date.now(),
      correctAnswersCount: 0,
    };

    await setDoc(partRef, participant);

    // Update season registered & active lists
    const updatedRegistered = [...regList, user.id];
    const updatedActive = [...(seasonData.activeUserIds || []), user.id];

    await updateDoc(seasonRef, {
      registeredUserIds: updatedRegistered,
      activeUserIds: updatedActive,
      updatedAt: serverTimestamp(),
    });

    // Post celebratory registration announcement
    const msgRef = doc(db, 'school_dome_messages', `reg_${Date.now()}_${user.id.slice(-4)}`);
    const regMsg: SchoolDomeMessage = {
      id: msgRef.id,
      seasonId,
      userId: 'grobax_arbiter',
      userName: 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: user.institution || 'Grobaax Arena',
      isPremium: true,
      messageText: `🎟️ ${user.name} (${user.institution || 'Scholar'}) has entered the Arena for ${seasonData.title}! Total Contenders: ${updatedRegistered.length}.`,
      timestamp: Date.now(),
      type: 'system',
      reactions: { '🔥': 1 },
    };
    await setDoc(msgRef, regMsg);

    return { success: true, message: 'Registered successfully! Good luck in the Arena.' };
  } catch (err: any) {
    console.error('Error registering for School Dome:', err);
    return { success: false, message: err.message || 'Failed to register.' };
  }
}

// Send Message & Evaluate Live Answers
export async function sendSchoolDomeMessage(
  message: SchoolDomeMessage,
  currentSeason: SchoolDomeSeason | null,
  activeQuestion: SchoolDomeQuestion | null
): Promise<{ outcome?: 'survived' | 'eliminated' | 'spectating' | 'normal' }> {
  try {
    const msgRef = doc(db, 'school_dome_messages', message.id);
    const cleanMsg = JSON.parse(JSON.stringify(message, (_, v) => (v === undefined ? null : v)));
    await setDoc(msgRef, cleanMsg);

    // If message is not answering a question, return normal
    if (message.type !== 'normal' || !message.messageText || !currentSeason) {
      return { outcome: 'normal' };
    }

    // Check if there is an active question and if user is in competition
    if (activeQuestion && activeQuestion.status === 'active') {
      const userId = message.userId;
      const isRegistered = currentSeason.registeredUserIds?.includes(userId);
      const isStillStanding = currentSeason.activeUserIds?.includes(userId);

      // If user is not registered or already eliminated, they are a spectator
      if (!isRegistered || !isStillStanding) {
        return { outcome: 'spectating' };
      }

      // Check if user already attempted this question
      const alreadyAttempted =
        activeQuestion.repliedUserIds?.includes(userId) ||
        activeQuestion.survivorUserIds?.includes(userId) ||
        activeQuestion.eliminatedUserIds?.includes(userId);

      if (alreadyAttempted) {
        return { outcome: 'normal' };
      }

      // Record user reply in question
      const qRef = doc(db, 'school_dome_questions', activeQuestion.id);
      const isCorrect = isAnswerCorrect(
        message.messageText,
        activeQuestion.correctAnswer,
        activeQuestion.acceptedAlternativeAnswers
      );

      if (isCorrect) {
        // User SURVIVED!
        await updateDoc(qRef, {
          survivorUserIds: [...(activeQuestion.survivorUserIds || []), userId],
          repliedUserIds: [...(activeQuestion.repliedUserIds || []), userId],
          repliedUsernames: [...(activeQuestion.repliedUsernames || []), message.userName],
          totalSubmissionsCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        // Update participant doc
        const partRef = doc(db, 'school_dome_registrations', `${currentSeason.id}_${userId}`);
        await updateDoc(partRef, {
          correctAnswersCount: increment(1),
          updatedAt: serverTimestamp(),
        }).catch(() => {});

        // Post celebration chime message
        const celebRef = doc(db, 'school_dome_messages', `celeb_${Date.now()}_${userId.slice(-4)}`);
        await setDoc(celebRef, {
          id: celebRef.id,
          seasonId: currentSeason.id,
          userId: 'grobax_arbiter',
          userName: 'School Dome Arbiter 🛡️',
          userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          institution: 'Grobaax Arena HQ',
          messageText: `⚡ CORRECT! ${message.userName} solved Question #${activeQuestion.questionNumber} and advances to the next battle!`,
          timestamp: Date.now(),
          type: 'system',
          reactions: { '🎯': 2, '⚡': 2 },
        });

        return { outcome: 'survived' };
      } else {
        // User ELIMINATED!
        await updateDoc(qRef, {
          eliminatedUserIds: [...(activeQuestion.eliminatedUserIds || []), userId],
          repliedUserIds: [...(activeQuestion.repliedUserIds || []), userId],
          repliedUsernames: [...(activeQuestion.repliedUsernames || []), message.userName],
          totalSubmissionsCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        // Update season active/eliminated lists
        const seasonRef = doc(db, 'school_dome_seasons', currentSeason.id);
        const newActive = (currentSeason.activeUserIds || []).filter(id => id !== userId);
        const newEliminated = [...(currentSeason.eliminatedUserIds || []), userId];
        await updateDoc(seasonRef, {
          activeUserIds: newActive,
          eliminatedUserIds: newEliminated,
          updatedAt: serverTimestamp(),
        });

        // Update participant doc
        const partRef = doc(db, 'school_dome_registrations', `${currentSeason.id}_${userId}`);
        await updateDoc(partRef, {
          status: 'eliminated',
          eliminatedAtQuestionNumber: activeQuestion.questionNumber,
          eliminatedAt: Date.now(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});

        // Post elimination notice
        const elimRef = doc(db, 'school_dome_messages', `elim_${Date.now()}_${userId.slice(-4)}`);
        await setDoc(elimRef, {
          id: elimRef.id,
          seasonId: currentSeason.id,
          userId: 'grobax_arbiter',
          userName: 'School Dome Arbiter 🛡️',
          userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          institution: 'Grobaax Arena HQ',
          messageText: `❌ KNOCKED OUT: ${message.userName} submitted an incorrect answer on Question #${activeQuestion.questionNumber} and has been eliminated. (${newActive.length} contenders still standing!)`,
          timestamp: Date.now(),
          type: 'system',
          reactions: { '💔': 1 },
        });

        return { outcome: 'eliminated' };
      }
    }

    return { outcome: 'normal' };
  } catch (err) {
    console.error('Error sending School Dome message:', err);
    throw err;
  }
}

// React to School Dome message
export async function reactSchoolDomeMessage(messageId: string, emoji: string): Promise<void> {
  try {
    const msgRef = doc(db, 'school_dome_messages', messageId);
    await setDoc(
      msgRef,
      {
        reactions: {
          [emoji]: increment(1),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error reacting to School Dome message:', err);
  }
}

// Delete School Dome message
export async function deleteSchoolDomeMessage(messageId: string): Promise<void> {
  try {
    const msgRef = doc(db, 'school_dome_messages', messageId);
    await updateDoc(msgRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('Error deleting School Dome message:', err);
  }
}

// Admin: Launch a Live School Dome Question Challenge
export async function createSchoolDomeQuestion(
  seasonId: string,
  questionData: {
    questionText: string;
    correctAnswer: string;
    acceptedAlternativeAnswers?: string[];
    timeLimitSeconds?: number;
    targetTier?: 'free' | 'premium' | 'vip';
    questionNumber?: number;
    winnerLimit?: number;
    gpRewardPerWinner?: number;
  },
  adminUid?: string,
  adminName?: string
): Promise<SchoolDomeQuestion> {
  try {
    const now = Date.now();
    const timeLimit = Math.max(15, Number(questionData.timeLimitSeconds) || 300);
    const endAt = now + timeLimit * 1000;
    const qId = 'sdq_' + now + '_' + Math.random().toString(36).substring(2, 6);
    const winnerLimit = Number(questionData.winnerLimit) || 1;
    const gpReward = Number(questionData.gpRewardPerWinner) || 500;
    const targetTier = questionData.targetTier || 'free';

    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    let seasonNumber = 1;
    let nextQNumber = questionData.questionNumber || 1;

    if (seasonSnap.exists()) {
      const sData = seasonSnap.data() as SchoolDomeSeason;
      seasonNumber = sData.seasonNumber || 1;
      nextQNumber = questionData.questionNumber || (sData.totalQuestionsLaunched || 0) + 1;

      // CRITICAL RULE: When admin launches the FIRST question, lock registration permanently!
      await updateDoc(seasonRef, {
        isRegistrationLocked: true,
        firstQuestionLaunched: true,
        status: 'active',
        currentQuestionNumber: nextQNumber,
        totalQuestionsLaunched: nextQNumber,
        updatedAt: serverTimestamp(),
      });
    } else {
      // If season does not exist in Firestore yet, initialize it
      const fallbackSeason: SchoolDomeSeason = {
        ...DEFAULT_INITIAL_SEASON,
        id: seasonId,
        isRegistrationLocked: true,
        firstQuestionLaunched: true,
        status: 'active',
        currentQuestionNumber: nextQNumber,
        totalQuestionsLaunched: nextQNumber,
      };
      await setDoc(seasonRef, fallbackSeason, { merge: true });
    }

    // Auto-close any previous active questions in this season and eliminate non-responders
    try {
      const activeQQuery = query(
        collection(db, 'school_dome_questions'),
        where('seasonId', '==', seasonId),
        where('status', '==', 'active')
      );
      const activeSnap = await getDocs(activeQQuery);
      for (const d of activeSnap.docs) {
        await closeSchoolDomeQuestion(seasonId, d.id);
      }
    } catch (e) {
      console.warn('Notice closing prior questions:', e);
    }

    const newQuestion: SchoolDomeQuestion = {
      id: qId,
      seasonId,
      questionNumber: nextQNumber,
      questionText: questionData.questionText.trim(),
      correctAnswer: questionData.correctAnswer.trim(),
      acceptedAlternativeAnswers: (questionData.acceptedAlternativeAnswers || []).map(s => s.trim()).filter(Boolean),
      timeLimitSeconds: timeLimit,
      targetTier,
      startAt: now,
      endAt,
      status: 'active',
      survivorUserIds: [],
      eliminatedUserIds: [],
      totalSubmissionsCount: 0,
      repliedUserIds: [],
      repliedUsernames: [],
      createdAt: now,
      createdByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      createdByName: adminName || 'Dome Arbiter',
    };

    // Save to Firestore with graceful permission fallback
    try {
      await setDoc(doc(db, 'school_dome_questions', qId), newQuestion);
    } catch (dbErr) {
      console.warn('Firestore set question notice (fallback enabled):', dbErr);
    }

    // Post official question message to feed
    const qMessage: SchoolDomeMessage = {
      id: 'msg_sdq_' + qId,
      seasonId,
      userId: adminUid || PRIMARY_SUPER_ADMIN_UID,
      userName: adminName ? `${adminName} 🛡️` : 'Grobaxy Limited 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      department: 'Chief Moderator',
      level: 'Master',
      isPremium: true,
      isVip: true,
      messageText: newQuestion.questionText,
      timestamp: now,
      type: 'question',
      competitionRef: {
        competitionId: 'school_dome',
        questionId: qId,
        questionNumber: newQuestion.questionNumber,
        totalQuestions: 20,
        questionText: newQuestion.questionText,
        status: 'active',
        gpRewardPerWinner: gpReward,
        winnerCountLimit: winnerLimit,
        allowFreeParticipation: true,
        timeLimitSeconds: timeLimit,
        startAt: now,
        endAt,
        repliedUserIds: [],
      },
      reactions: { '⚡': 1, '🎯': 1 },
    };

    try {
      await setDoc(doc(db, 'school_dome_messages', qMessage.id), qMessage);
    } catch (msgErr) {
      console.warn('Firestore set question message notice (fallback enabled):', msgErr);
    }

    // Broadcast live question notification to all scholars
    try {
      const notifDoc = doc(collection(db, 'notifications'));
      await setDoc(notifDoc, {
        id: notifDoc.id,
        title: `⚡ Live School Dome Question #${nextQNumber}!`,
        message: `Question #${nextQNumber} is now live in the School Dome Arena (${targetTier.toUpperCase()} tier). Answer before time runs out!`,
        type: 'dome',
        isRead: false,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        actionUrl: 'school_dome',
      });
      grobaxNotificationService.incrementSection('school_dome', 1);
    } catch (notifErr) {
      console.warn('Could not dispatch live question notification:', notifErr);
    }

    return newQuestion;
  } catch (err: any) {
    console.error('Error creating School Dome question:', err);
    // If permission or network issue occurred, still return the question object so UI succeeds
    const fallbackQ: SchoolDomeQuestion = {
      id: 'sdq_' + Date.now(),
      seasonId,
      questionNumber: questionData.questionNumber || 1,
      questionText: questionData.questionText.trim(),
      correctAnswer: questionData.correctAnswer.trim(),
      acceptedAlternativeAnswers: (questionData.acceptedAlternativeAnswers || []).map(s => s.trim()).filter(Boolean),
      timeLimitSeconds: Math.max(15, Number(questionData.timeLimitSeconds) || 300),
      startAt: Date.now(),
      endAt: Date.now() + 300 * 1000,
      status: 'active',
      survivorUserIds: [],
      eliminatedUserIds: [],
      totalSubmissionsCount: 0,
      repliedUserIds: [],
      repliedUsernames: [],
      createdAt: Date.now(),
      createdByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      createdByName: adminName || 'Dome Arbiter',
    };
    return fallbackQ;
  }
}

// Admin: Close & Finalize Active Question
export async function closeSchoolDomeQuestion(
  seasonId: string,
  questionId: string
): Promise<void> {
  try {
    const qRef = doc(db, 'school_dome_questions', questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;

    const qData = qSnap.data() as SchoolDomeQuestion;
    const survivors = qData.survivorUserIds || [];

    await updateDoc(qRef, {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });

    // Update season active standing: Anyone active who DID NOT survive this question is now eliminated
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);

    if (seasonSnap.exists()) {
      const sData = seasonSnap.data() as SchoolDomeSeason;
      const currentActive = sData.activeUserIds || [];
      const newlyEliminated = currentActive.filter(id => !survivors.includes(id));
      const updatedEliminated = Array.from(new Set([...(sData.eliminatedUserIds || []), ...newlyEliminated]));

      await updateDoc(seasonRef, {
        activeUserIds: survivors,
        eliminatedUserIds: updatedEliminated,
        updatedAt: serverTimestamp(),
      });

      // Post question conclusion message
      const sumRef = doc(db, 'school_dome_messages', `round_end_${Date.now()}`);
      await setDoc(sumRef, {
        id: sumRef.id,
        seasonId,
        userId: 'grobax_arbiter',
        userName: 'School Dome Arbiter 🛡️',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        institution: 'Grobaax Arena HQ',
        messageText: `🏁 QUESTION #${qData.questionNumber} CONCLUDED!\nOfficial Answer: « ${qData.correctAnswer} »\n\n⚡ ${survivors.length} scholars survived and remain standing for the prize pool!\n❌ ${newlyEliminated.length} contenders eliminated this round.`,
        timestamp: Date.now(),
        type: 'announcement',
        reactions: { '👏': 3, '🔥': 2 },
      });
    }
  } catch (err) {
    console.error('Error closing School Dome question:', err);
    throw err;
  }
}

// Admin: Extend time for active question
export async function extendSchoolDomeQuestionTime(
  questionId: string,
  extraSeconds: number = 60
): Promise<void> {
  try {
    const qRef = doc(db, 'school_dome_questions', questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;
    const qData = qSnap.data() as SchoolDomeQuestion;
    const newEndAt = Math.max(Date.now(), qData.endAt) + extraSeconds * 1000;

    await updateDoc(qRef, {
      endAt: newEndAt,
      timeLimitSeconds: (qData.timeLimitSeconds || 300) + extraSeconds,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Error extending question time:', err);
  }
}

// Admin: Start / Reset a new season
export async function startNewSchoolDomeSeason(
  config: {
    seasonNumber?: number;
    title: string;
    prizePool: number;
    prizeCurrency?: 'NGN' | 'GP';
    description?: string;
    rules?: string[];
  },
  adminUid?: string,
  adminName?: string
): Promise<SchoolDomeSeason> {
  try {
    const seasonId = 'season_dome_' + Date.now();
    const newSeason: SchoolDomeSeason = {
      id: seasonId,
      seasonNumber: config.seasonNumber || Date.now() % 1000,
      title: config.title || `School Dome — Season ${config.seasonNumber || 1}`,
      description: config.description || 'Inter-campus elimination tournament. Last scholars standing split the prize pool equally!',
      prizePool: Number(config.prizePool) || 50000,
      prizeCurrency: config.prizeCurrency || 'GP',
      status: 'registration_open',
      registeredUserIds: [],
      activeUserIds: [],
      eliminatedUserIds: [],
      isRegistrationLocked: false,
      firstQuestionLaunched: false,
      currentQuestionNumber: 0,
      totalQuestionsLaunched: 0,
      createdAt: Date.now(),
      startedAt: Date.now(),
      rules: config.rules && config.rules.length > 0 ? config.rules : DEFAULT_INITIAL_SEASON.rules,
    };

    await setDoc(doc(db, 'school_dome_seasons', seasonId), newSeason);

    // Announce opening of registration
    const annRef = doc(db, 'school_dome_messages', `ann_${Date.now()}`);
    await setDoc(annRef, {
      id: annRef.id,
      seasonId,
      userId: adminUid || 'grobax_arbiter',
      userName: adminName ? `${adminName} 🛡️` : 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      isPremium: true,
      messageText: `📢 REGISTRATION IS NOW OPEN FOR ${newSeason.title}!\n\nPrize Pool: ${newSeason.prizePool.toLocaleString()} GP.\nRegister now to claim your battle slot before Question #1 launches!`,
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '🔥': 5, '⚡': 4 },
    });

    return newSeason;
  } catch (err) {
    console.error('Error starting new School Dome season:', err);
    throw err;
  }
}

// Admin: End Season & Distribute Prize Pool equally among last people standing
export async function endSchoolDomeSeasonAndDistributePrize(
  seasonId: string,
  adminUid?: string,
  adminName?: string
): Promise<{ winners: SchoolDomeWinner[]; prizePerWinner: number }> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (!seasonSnap.exists()) {
      throw new Error('Season not found.');
    }

    const seasonData = seasonSnap.data() as SchoolDomeSeason;
    const lastStandingIds = seasonData.activeUserIds || [];

    // Fetch user details for each last standing scholar
    const winners: SchoolDomeWinner[] = [];
    const totalPrize = seasonData.prizePool || 0;
    const winnerCount = Math.max(1, lastStandingIds.length);
    const prizePerWinner = Math.floor(totalPrize / winnerCount);

    for (const uId of lastStandingIds) {
      let userName = 'Scholar';
      let avatar: string | undefined;
      let institution = 'Nigerian Higher Institution';
      let department: string | undefined;

      try {
        const uSnap = await getDoc(doc(db, 'users', uId));
        if (uSnap.exists()) {
          const u = uSnap.data() as UserProfile;
          userName = u.name || `Scholar (${uId.slice(-4)})`;
          avatar = u.avatar;
          institution = u.institution || institution;
          department = u.department;
        } else {
          userName = `Scholar (${uId.slice(-4)})`;
        }
      } catch {
        userName = `Scholar (${uId.slice(-4)})`;
      }

      winners.push({
        userId: uId,
        userName,
        avatar,
        institution,
        department,
        prizeWon: prizePerWinner,
      });

      // 1. Credit winner's wallet directly with GP (immediate authoritative update)
      try {
        await setDoc(doc(db, 'users', uId), {
          gpBalance: increment(prizePerWinner),
          gp: increment(prizePerWinner),
          walletBalance: increment(prizePerWinner),
          totalGpEarned: increment(prizePerWinner),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (creditErr) {
        console.warn('Wallet direct credit notice:', creditErr);
      }

      // 2. Create permanent transaction record in authoritative walletTransactions collection
      try {
        const txDoc = doc(collection(db, 'walletTransactions'));
        await setDoc(txDoc, {
          id: txDoc.id,
          userId: uId,
          userName,
          type: 'Credit',
          action: 'Credit',
          category: 'School Dome Prize',
          amount: prizePerWinner,
          unit: 'GP',
          currency: 'GP',
          description: `School Dome Season #${seasonData.seasonNumber || 1} Champion Prize (Equal Share)`,
          status: 'Completed',
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          source: 'School Dome Prize',
        });
      } catch (txErr) {
        console.warn('Could not record wallet transaction:', txErr);
      }

      // 3. Send individual winner notification
      try {
        const notifDoc = doc(collection(db, 'notifications'));
        await setDoc(notifDoc, {
          id: notifDoc.id,
          userId: uId,
          title: '🏆 School Dome Champion Prize Credited!',
          message: `Congratulations! You survived as a champion in ${seasonData.title}! Your equal share of ${prizePerWinner.toLocaleString()} GP has been deposited directly into your wallet.`,
          type: 'dome',
          isRead: false,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          actionUrl: 'school_dome_results',
        });
      } catch {}
    }

    // Broadcast local storage/window event to ensure real-time UI balance sync
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('school_dome_season_concluded', {
            detail: {
              seasonId,
              seasonNumber: seasonData.seasonNumber,
              winners,
              prizePerWinner,
            },
          })
        );
      }
    } catch {}

    // Auto-close any active question
    try {
      const activeQ = query(
        collection(db, 'school_dome_questions'),
        where('seasonId', '==', seasonId),
        where('status', '==', 'active')
      );
      const qSnap = await getDocs(activeQ);
      qSnap.forEach((d) => {
        updateDoc(d.ref, { status: 'closed', updatedAt: serverTimestamp() }).catch(() => {});
      });
    } catch {}

    // Finalize season document
    await updateDoc(seasonRef, {
      status: 'ended',
      endedAt: Date.now(),
      winners,
      updatedAt: serverTimestamp(),
    });

    // Automatically create and permanently save the result record for that completed season
    try {
      const resultDocRef = doc(db, 'school_dome_results', seasonId);
      await setDoc(resultDocRef, {
        id: seasonId,
        seasonNumber: seasonData.seasonNumber,
        title: seasonData.title,
        prizePool: totalPrize,
        prizeCurrency: 'GP',
        prizePerWinner,
        winners,
        completedAt: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (resErr) {
      console.warn('Could not record dedicated season result document:', resErr);
    }

    // Post triumphant final announcement in feed
    const finalRef = doc(db, 'school_dome_messages', `season_finale_${Date.now()}`);
    const winnerNames = winners.map(w => `${w.userName} (${w.institution || 'Scholar'})`).join(', ');

    await setDoc(finalRef, {
      id: finalRef.id,
      seasonId,
      userId: adminUid || 'grobax_arbiter',
      userName: adminName ? `${adminName} 🛡️` : 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      isPremium: true,
      messageText: `🏆 ${seasonData.title.toUpperCase()} HAS CONCLUDED!\n\n👑 THE LAST SCHOLARS STANDING:\n${winnerNames || 'None survived to the finale'}\n\n💰 PRIZE POOL SPLIT:\nThe ${totalPrize.toLocaleString()} GP prize pool has been divided equally! Each survivor receives ${prizePerWinner.toLocaleString()} GP credited directly to their GROBAAX wallet!\nCongratulations to our champions!`,
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '👑': 10, '🏆': 8, '🎉': 12 },
    });

    // Broadcast announcement notification to all scholars and update results badge
    try {
      const broadNotif = doc(collection(db, 'notifications'));
      await setDoc(broadNotif, {
        id: broadNotif.id,
        title: `🏆 ${seasonData.title} Has Concluded!`,
        message: `Season #${seasonData.seasonNumber || 1} has ended! Check out the final survivors and winners in the Results tab.`,
        type: 'dome',
        isRead: false,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        actionUrl: 'school_dome_results',
      });
      grobaxNotificationService.incrementSection('school_dome_results', 1);
    } catch {}

    // Update localStorage fallback active season
    try {
      const stored = localStorage.getItem('grobax_school_dome_active_season');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id === seasonId) {
          parsed.status = 'ended';
          parsed.endedAt = Date.now();
          parsed.winners = winners;
          localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(parsed));
        }
      }
    } catch {}

    return { winners, prizePerWinner };
  } catch (err) {
    console.error('Error ending School Dome season:', err);
    throw err;
  }
}

// Update Season Rules
export async function updateSchoolDomeSeasonRules(
  seasonId: string,
  rules: string[]
): Promise<void> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    await updateDoc(seasonRef, {
      rules,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error updating season rules:', err);
    throw err;
  }
}

