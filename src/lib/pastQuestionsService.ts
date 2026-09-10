import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  PastQuestion,
  PastQuestionSettings,
  PastQuestionStatus,
  PastQuestionViewRecord,
  PastQuestionUploadRecord,
  UserUploadCooldownStatus,
} from '../types';
import { recordWalletTransactionInFirestore } from './firebase';
import { grobaxNotificationService } from './notificationService';

const PAST_QUESTIONS_COLLECTION = 'past_questions';
const PAST_QUESTION_VIEWS_COLLECTION = 'past_question_views';
const PAST_QUESTION_UPLOADS_COLLECTION = 'past_question_uploads';
const PAST_QUESTION_BOOKMARKS_COLLECTION = 'past_question_bookmarks';
const PAST_QUESTION_SETTINGS_DOC = 'past_question_settings/config';

export const DEFAULT_PAST_QUESTION_SETTINGS: PastQuestionSettings = {
  enabled: true,
  uploadGpReward: 50,
  freeDailyViewLimit: 2,
  premiumDailyViewLimit: 10,
  vipDailyViewLimit: 'unlimited',
  allowUserUploads: true,
  requireVerification: true,
  maxUploadsPerWeek: 1,
  maxUploadsPerDay: 1,
  freeCanUpload: false,
  premiumUploadCooldownDays: 30,
  vipUploadCooldownDays: 15,
};

// Helper for clean ISO Date YYYY-MM-DD
export function getTodayDateKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper for clean ISO Week key YYYY-Www (e.g. 2026-W36)
export function getYearWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Generate unique composite key
export function generateCompositeKey(
  institutionId: string,
  departmentName: string,
  level: string,
  courseCode: string,
  academicSession: string,
  semester: string
): string {
  const sanitize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${sanitize(institutionId)}_${sanitize(departmentName)}_${sanitize(level)}_${sanitize(courseCode)}_${sanitize(academicSession)}_${sanitize(semester)}`;
}

/**
 * Fetch Past Question Settings
 */
export async function fetchPastQuestionSettings(): Promise<PastQuestionSettings> {
  try {
    const docRef = doc(db, 'settings', 'past_questions');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_PAST_QUESTION_SETTINGS, ...snap.data() } as PastQuestionSettings;
    }
  } catch (err) {
    console.warn('Could not load past question settings from Firestore, using defaults:', err);
  }
  return DEFAULT_PAST_QUESTION_SETTINGS;
}

/**
 * Save Past Question Settings (Admin only)
 */
export async function savePastQuestionSettings(settings: Partial<PastQuestionSettings>): Promise<PastQuestionSettings> {
  const updated: PastQuestionSettings = {
    ...DEFAULT_PAST_QUESTION_SETTINGS,
    ...settings,
    uploadGpReward: Math.max(0, Number(settings.uploadGpReward) || 50),
    freeDailyViewLimit: Math.max(1, Number(settings.freeDailyViewLimit) || 2),
    premiumDailyViewLimit: Math.max(1, Number(settings.premiumDailyViewLimit) || 10),
    vipDailyViewLimit: settings.vipDailyViewLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(settings.vipDailyViewLimit) || 20),
    maxUploadsPerWeek: Math.max(1, Number(settings.maxUploadsPerWeek) || Number(settings.maxUploadsPerDay) || 1),
    maxUploadsPerDay: Math.max(1, Number(settings.maxUploadsPerWeek) || Number(settings.maxUploadsPerDay) || 1),
    freeCanUpload: false, // strictly enforced: free cannot upload
    premiumUploadCooldownDays: 30, // Premium: 1 upload every 30 days
    vipUploadCooldownDays: 15, // VIP: 1 upload every 15 days
  };

  try {
    const docRef = doc(db, 'settings', 'past_questions');
    await setDoc(docRef, updated, { merge: true });
    // Also notify server endpoint if running
    fetch('/api/library/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updated }),
    }).catch(() => {});
  } catch (err) {
    console.warn('Could not save past question settings to Firestore:', err);
  }
  return updated;
}

/**
 * Check User Upload Cooldown & Tier Eligibility:
 * - Free users: CANNOT upload anything until they subscribe.
 * - Premium users: 1 upload every 30 days (daily countdown deducting from 30 days).
 * - VIP users: 1 upload every 15 days (daily countdown deducting from 15 days).
 */
export async function checkUserUploadCooldown(
  userId: string,
  userTier: 'free' | 'premium' | 'vip' = 'free'
): Promise<UserUploadCooldownStatus> {
  if (!userId) {
    return {
      canUpload: false,
      userTier: 'free',
      cooldownDays: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingUploads: 0,
      lastUploadDate: null,
      nextEligibleDate: null,
      reason: 'UPGRADE_REQUIRED',
      message: 'Please sign in to upload past questions.',
    };
  }

  // 1. FREE USERS: STRICTLY CANNOT UPLOAD
  if (userTier === 'free') {
    return {
      canUpload: false,
      userTier: 'free',
      cooldownDays: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingUploads: 0,
      lastUploadDate: null,
      nextEligibleDate: null,
      reason: 'UPGRADE_REQUIRED',
      message: 'Free scholars cannot upload past questions. Upgrade to Premium (1 upload in 30 days) or VIP (1 upload in 15 days) to upload and earn GP rewards!',
    };
  }

  // 2. Cooldown configuration
  // Premium: 30 days, VIP: 15 days
  const cooldownDays = userTier === 'vip' ? 15 : 30;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

  // Check local cache for fast response
  const localLastUploadKey = `grobax_pq_last_upload_${userId}`;
  let lastUploadDate: string | null = null;
  try {
    lastUploadDate = localStorage.getItem(localLastUploadKey) || null;
  } catch {}

  try {
    // Query Firestore uploads for this user
    const q = query(
      collection(db, PAST_QUESTION_UPLOADS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const upDate = d.uploadedAt || d.date;
      if (upDate) {
        if (!lastUploadDate || new Date(upDate).getTime() > new Date(lastUploadDate).getTime()) {
          lastUploadDate = upDate;
        }
      }
    }

    // Also check past_questions collection
    if (!lastUploadDate) {
      const pqQ = query(
        collection(db, PAST_QUESTIONS_COLLECTION),
        where('uploadedBy', '==', userId)
      );
      const pqSnap = await getDocs(pqQ);
      for (const docSnap of pqSnap.docs) {
        const d = docSnap.data();
        if (d.uploadedAt) {
          if (!lastUploadDate || new Date(d.uploadedAt).getTime() > new Date(lastUploadDate).getTime()) {
            lastUploadDate = d.uploadedAt;
          }
        }
      }
    }

    if (lastUploadDate) {
      try {
        localStorage.setItem(localLastUploadKey, lastUploadDate);
      } catch {}
    }
  } catch (err) {
    console.warn('Notice querying upload cooldown from Firestore:', err);
  }

  // If user has never uploaded before, they can upload right now!
  if (!lastUploadDate) {
    return {
      canUpload: true,
      userTier,
      cooldownDays,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingUploads: 1,
      lastUploadDate: null,
      nextEligibleDate: null,
      reason: 'OK',
      message: `1 upload ready (${cooldownDays}-day cycle for ${userTier.toUpperCase()})`,
    };
  }

  // Calculate elapsed time
  const uploadTime = new Date(lastUploadDate).getTime();
  const now = Date.now();
  const elapsedMs = now - uploadTime;

  if (elapsedMs >= cooldownMs) {
    return {
      canUpload: true,
      userTier,
      cooldownDays,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingUploads: 1,
      lastUploadDate,
      nextEligibleDate: null,
      reason: 'OK',
      message: `1 upload ready (${cooldownDays}-day cycle for ${userTier.toUpperCase()})`,
    };
  }

  // Cooldown is still active: every day deducting till next time
  const diffMs = cooldownMs - elapsedMs;
  const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
  const nextEligibleDate = new Date(uploadTime + cooldownMs).toISOString();

  return {
    canUpload: false,
    userTier,
    cooldownDays,
    daysRemaining,
    hoursRemaining,
    remainingUploads: 0,
    lastUploadDate,
    nextEligibleDate,
    reason: 'COOLDOWN_ACTIVE',
    message: `Next upload in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${cooldownDays}-day cycle for ${userTier.toUpperCase()})`,
  };
}

/**
 * Backwards compatibility check for weekly upload limit - wraps checkUserUploadCooldown
 */
export async function checkUserWeeklyUploadLimit(
  userId: string,
  userTier: 'free' | 'premium' | 'vip' = 'free'
): Promise<{
  canUpload: boolean;
  weekUploadCount: number;
  maxUploadsPerWeek: number;
  remainingUploads: number;
  currentWeekKey: string;
  cooldownStatus: UserUploadCooldownStatus;
}> {
  const cooldown = await checkUserUploadCooldown(userId, userTier);
  return {
    canUpload: cooldown.canUpload,
    weekUploadCount: cooldown.canUpload ? 0 : 1,
    maxUploadsPerWeek: 1,
    remainingUploads: cooldown.remainingUploads,
    currentWeekKey: getYearWeekKey(),
    cooldownStatus: cooldown,
  };
}

/**
 * Backward compatibility alias for upload check
 */
export async function checkUserDailyUploadLimit(
  userId: string,
  userTier: 'free' | 'premium' | 'vip' = 'free'
): Promise<{
  canUpload: boolean;
  todayUploadCount: number;
  maxUploadsPerDay: number;
  remainingUploads: number;
  weekUploadCount: number;
  maxUploadsPerWeek: number;
  cooldownStatus: UserUploadCooldownStatus;
}> {
  const res = await checkUserWeeklyUploadLimit(userId, userTier);
  return {
    canUpload: res.canUpload,
    todayUploadCount: res.weekUploadCount,
    maxUploadsPerDay: res.maxUploadsPerWeek,
    remainingUploads: res.remainingUploads,
    weekUploadCount: res.weekUploadCount,
    maxUploadsPerWeek: res.maxUploadsPerWeek,
    cooldownStatus: res.cooldownStatus,
  };
}

/**
 * Check for duplicate past questions (enforcing session uniqueness per course)
 */
export async function checkDuplicatePastQuestion(
  compositeKey: string,
  extraCheck?: {
    institutionId?: string;
    courseCode?: string;
    academicSession?: string;
    departmentName?: string;
  }
): Promise<{
  isDuplicate: boolean;
  existingQuestion?: PastQuestion;
  message?: string;
}> {
  try {
    // 1. Primary check by compositeKey
    if (compositeKey) {
      const q = query(
        collection(db, PAST_QUESTIONS_COLLECTION),
        where('compositeKey', '==', compositeKey)
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const data = { id: docSnap.id, ...docSnap.data() } as PastQuestion;
        if (data.status !== 'rejected') {
          return {
            isDuplicate: true,
            existingQuestion: data,
            message: `A past question for ${data.courseCode} (${data.academicSession}) already exists. You cannot upload for this session; please enter another session.`,
          };
        }
      }
    }

    // 2. Extra check: Course Code + Session match within the institution
    if (extraCheck?.courseCode && extraCheck?.academicSession) {
      const normCourse = extraCheck.courseCode.trim().toUpperCase().replace(/\s+/g, '');
      const normSession = extraCheck.academicSession.trim().replace(/\s+/g, '');

      const q = query(collection(db, PAST_QUESTIONS_COLLECTION), limit(150));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const data = { id: docSnap.id, ...docSnap.data() } as PastQuestion;
        if (data.status === 'rejected') continue;

        const docCourse = (data.courseCode || '').trim().toUpperCase().replace(/\s+/g, '');
        const docSession = (data.academicSession || '').trim().replace(/\s+/g, '');

        if (docCourse === normCourse && docSession === normSession) {
          const instMatch =
            !extraCheck.institutionId ||
            !data.institutionId ||
            extraCheck.institutionId.toLowerCase() === data.institutionId.toLowerCase();

          if (instMatch) {
            return {
              isDuplicate: true,
              existingQuestion: data,
              message: `A past question for ${data.courseCode} for the ${data.academicSession} session has already been uploaded. Duplicate uploads for this session are not allowed. Please input another session.`,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error checking duplicate in Firestore:', err);
  }
  return { isDuplicate: false };
}

/**
 * Submit a Past Question by Student (Enforces weekly upload limit and duplicate session prevention)
 */
export async function submitPastQuestion(data: {
  institutionId: string;
  institutionName: string;
  institutionCategory: string;
  facultyName: string;
  departmentName: string;
  level: string;
  courseCode: string;
  courseTitle: string;
  academicSession: string;
  semester: '1st Semester' | '2nd Semester' | '1st' | '2nd';
  examType?: string;
  fileUrl: string;
  fileUrls?: string[];
  fileName?: string;
  fileType: 'image' | 'pdf' | 'document';
  pagesCount?: number;
  description?: string;
  lecturerName?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByEmail?: string;
  userTier?: 'free' | 'premium' | 'vip';
  userProfile?: {
    institution?: string;
    institutionName?: string;
    faculty?: string;
    facultyName?: string;
    department?: string;
    departmentName?: string;
  };
}): Promise<{ success: boolean; questionId?: string; error?: string }> {
  try {
    // 1. Verify user subscription tier and upload cooldown
    const cooldownCheck = await checkUserUploadCooldown(data.uploadedBy, data.userTier || 'free');
    if (!cooldownCheck.canUpload) {
      if (cooldownCheck.reason === 'UPGRADE_REQUIRED') {
        return {
          success: false,
          error: 'Free scholars cannot upload past questions. Upgrade to Premium (1 upload every 30 days) or VIP (1 upload every 15 days) to contribute and earn GP!',
        };
      }
      return {
        success: false,
        error: `Upload cooldown active. Next upload available in ${cooldownCheck.daysRemaining} day${cooldownCheck.daysRemaining === 1 ? '' : 's'}. Premium scholars can upload once every 30 days, VIP scholars once every 15 days.`,
      };
    }

    // 2. Generate composite key & verify session duplicate
    const compositeKey = generateCompositeKey(
      data.institutionId,
      data.departmentName,
      data.level,
      data.courseCode,
      data.academicSession,
      data.semester
    );

    const dupCheck = await checkDuplicatePastQuestion(compositeKey, {
      institutionId: data.institutionId,
      courseCode: data.courseCode,
      academicSession: data.academicSession,
      departmentName: data.departmentName,
    });

    if (dupCheck.isDuplicate) {
      return {
        success: false,
        error:
          dupCheck.message ||
          `A past question for ${data.courseCode.toUpperCase()} (${data.academicSession}) has already been uploaded. You cannot upload for this session; please enter another session.`,
      };
    }

    // 4. Create past question doc
    const questionId = `PQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPastQuestion: PastQuestion = {
      id: questionId,
      institutionId: data.institutionId,
      institutionName: data.institutionName,
      institutionCategory: data.institutionCategory,
      facultyName: data.facultyName,
      departmentName: data.departmentName,
      level: data.level,
      courseCode: data.courseCode.trim().toUpperCase(),
      courseTitle: data.courseTitle.trim(),
      academicSession: data.academicSession.trim(),
      semester: data.semester,
      examType: data.examType || 'Main Examination',
      fileUrl: data.fileUrl,
      fileUrls: data.fileUrls || [data.fileUrl],
      fileName: data.fileName || `${data.courseCode.toUpperCase()}_${data.academicSession}.pdf`,
      fileType: data.fileType,
      pagesCount: data.pagesCount || (data.fileUrls ? data.fileUrls.length : 1),
      description: data.description || '',
      lecturerName: data.lecturerName || '',
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName || 'Scholar',
      uploadedByEmail: data.uploadedByEmail || '',
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      viewsCount: 0,
      bookmarksCount: 0,
      compositeKey,
    };

    await setDoc(doc(db, PAST_QUESTIONS_COLLECTION, questionId), newPastQuestion);

    // 5. Record upload log for cooldown tracking
    const todayKey = getTodayDateKey();
    const weekKey = getYearWeekKey();
    const nowIso = new Date().toISOString();
    const uploadLogRef = doc(collection(db, PAST_QUESTION_UPLOADS_COLLECTION));
    await setDoc(uploadLogRef, {
      userId: data.uploadedBy,
      questionId,
      date: todayKey,
      week: weekKey,
      userTier: data.userTier || 'premium',
      uploadedAt: nowIso,
      uploadedAtMillis: Date.now(),
    });

    // Update local storage backup for instantaneous cooldown deduction
    try {
      localStorage.setItem(`grobax_pq_last_upload_${data.uploadedBy}`, nowIso);
      const localKey = `grobax_pq_upload_${data.uploadedBy}_${weekKey}`;
      const cur = Number(localStorage.getItem(localKey) || '0');
      localStorage.setItem(localKey, String(cur + 1));
    } catch {}

    // Invalidate caches so UI displays changes immediately
    clearApprovedQuestionsCache();

    // 6. Dispatch Real-Time Admin Notification to Firestore & Notification Service
    try {
      const notifData = {
        title: 'New Past Question Uploaded',
        message: `${data.uploadedByName || 'Scholar'} submitted ${data.courseCode.toUpperCase()} (${data.academicSession}) for ${data.institutionName}. Pending review in vault.`,
        type: 'academic_library',
        targetRole: 'admin',
        actionUrl: 'admin:library',
        isRead: false,
        createdAt: serverTimestamp(),
        createdAtMillis: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        meta: {
          questionId,
          courseCode: data.courseCode.toUpperCase(),
          courseTitle: data.courseTitle,
          institutionName: data.institutionName,
          academicSession: data.academicSession,
          departmentName: data.departmentName,
          facultyName: data.facultyName,
          uploadedBy: data.uploadedBy,
          uploadedByName: data.uploadedByName,
          uploadedByEmail: data.uploadedByEmail,
        },
      };

      await addDoc(collection(db, 'notifications'), notifData);

      // User notification confirming achievement submission activity
      const currentSettings = await fetchPastQuestionSettings();
      await addDoc(collection(db, 'notifications'), {
        userId: data.uploadedBy,
        title: '📄 Past Question Uploaded for Verification',
        message: `Your contribution for ${data.courseCode.toUpperCase()} (${data.institutionName}) has been submitted to the faculty arbiters. +${currentSettings.uploadGpReward} GP will be credited once verified!`,
        type: 'academic_library',
        actionUrl: 'library',
        isRead: false,
        createdAt: serverTimestamp(),
        createdAtMillis: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      // Increment admin library unread count in notification service
      grobaxNotificationService.incrementSection('admin_library', 1);
      grobaxNotificationService.incrementSection('library', 1);
    } catch (notifErr) {
      console.warn('Admin past question notification notice:', notifErr);
    }

    return { success: true, questionId };
  } catch (err: any) {
    console.error('Error submitting past question:', err);
    return { success: false, error: err?.message || 'Failed to submit past question. Please try again.' };
  }
}

/**
 * Real-time subscription to Past Questions (for admin moderation)
 */
export function subscribeToAdminPastQuestions(
  callback: (questions: PastQuestion[]) => void,
  statusFilter?: PastQuestionStatus | 'all'
): () => void {
  try {
    let q = query(collection(db, PAST_QUESTIONS_COLLECTION));
    if (statusFilter && statusFilter !== 'all') {
      q = query(collection(db, PAST_QUESTIONS_COLLECTION), where('status', '==', statusFilter));
    }
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PastQuestion));
        list.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
        callback(list);
      },
      (err) => {
        console.warn('Admin past questions real-time subscription notice:', err);
      }
    );
  } catch (err) {
    console.warn('subscribeToAdminPastQuestions setup notice:', err);
    return () => {};
  }
}

let _approvedQuestionsCache: PastQuestion[] | null = null;
let _approvedQuestionsCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh cache

export function clearApprovedQuestionsCache(): void {
  _approvedQuestionsCache = null;
  _approvedQuestionsCacheTimestamp = 0;
  try {
    localStorage.removeItem('grobax_pq_approved_cache');
  } catch {}
}

export function getCachedApprovedPastQuestions(): PastQuestion[] {
  if (_approvedQuestionsCache && _approvedQuestionsCache.length > 0) {
    return _approvedQuestionsCache;
  }
  try {
    const raw = localStorage.getItem('grobax_pq_approved_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _approvedQuestionsCache = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Fetch Approved Past Questions with Optional Filters (Fast Multi-Layer Cached)
 */
export async function fetchApprovedPastQuestions(filters?: {
  institutionCategory?: string;
  institutionId?: string;
  facultyName?: string;
  departmentName?: string;
  level?: string;
  academicSession?: string;
  semester?: string;
  searchQuery?: string;
  bypassCache?: boolean;
}): Promise<PastQuestion[]> {
  const now = Date.now();
  let baseList: PastQuestion[] = [];

  const isCacheValid =
    !filters?.bypassCache &&
    _approvedQuestionsCache &&
    _approvedQuestionsCache.length > 0 &&
    now - _approvedQuestionsCacheTimestamp < CACHE_TTL_MS;

  if (isCacheValid && _approvedQuestionsCache) {
    baseList = [..._approvedQuestionsCache];
  } else {
    try {
      const q = query(
        collection(db, PAST_QUESTIONS_COLLECTION),
        where('status', '==', 'approved')
      );
      const snap = await getDocs(q);
      baseList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PastQuestion));

      // Sort by upload date desc
      baseList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      // If empty in Firestore, fallback to sample starter questions
      if (baseList.length === 0 && SAMPLE_VERIFIED_PAST_QUESTIONS.length > 0) {
        baseList = SAMPLE_VERIFIED_PAST_QUESTIONS.map((s, idx) => ({
          ...s,
          id: `pq-sample-${idx + 1}`,
        })) as PastQuestion[];
      }

      // Update in-memory & local caches
      _approvedQuestionsCache = baseList;
      _approvedQuestionsCacheTimestamp = now;
      try {
        localStorage.setItem('grobax_pq_approved_cache', JSON.stringify(baseList));
      } catch {}
    } catch (err) {
      console.warn('Error fetching approved past questions from Firestore, checking cache:', err);
      baseList = getCachedApprovedPastQuestions();
      if (baseList.length === 0) {
        baseList = SAMPLE_VERIFIED_PAST_QUESTIONS.map((s, idx) => ({
          ...s,
          id: `pq-sample-${idx + 1}`,
        })) as PastQuestion[];
      }
    }
  }

  // In-memory filter pipeline for responsive multi-dimensional querying
  let list = [...baseList];
  if (filters) {
    if (filters.institutionCategory && filters.institutionCategory !== 'All Categories') {
      list = list.filter((item) => item.institutionCategory === filters.institutionCategory);
    }
    if (filters.institutionId && filters.institutionId !== 'all') {
      list = list.filter((item) => item.institutionId === filters.institutionId);
    }
    if (filters.facultyName && filters.facultyName !== 'All Faculties' && filters.facultyName !== 'all') {
      list = list.filter((item) => item.facultyName === filters.facultyName);
    }
    if (filters.departmentName && filters.departmentName !== 'All Departments' && filters.departmentName !== 'all') {
      list = list.filter((item) => item.departmentName.toLowerCase() === filters.departmentName?.toLowerCase());
    }
    if (filters.level && filters.level !== 'All Levels' && filters.level !== 'all') {
      list = list.filter((item) => item.level.toLowerCase().includes(filters.level?.toLowerCase() || ''));
    }
    if (filters.academicSession && filters.academicSession !== 'All Sessions') {
      list = list.filter((item) => item.academicSession === filters.academicSession);
    }
    if (filters.semester && filters.semester !== 'All Semesters') {
      list = list.filter((item) => item.semester.toLowerCase().includes(filters.semester?.toLowerCase() || ''));
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const queryTerm = filters.searchQuery.toLowerCase().trim();
      list = list.filter((item) =>
        item.courseCode.toLowerCase().includes(queryTerm) ||
        item.courseTitle.toLowerCase().includes(queryTerm) ||
        item.departmentName.toLowerCase().includes(queryTerm) ||
        item.facultyName.toLowerCase().includes(queryTerm) ||
        item.institutionName.toLowerCase().includes(queryTerm) ||
        item.academicSession.toLowerCase().includes(queryTerm)
      );
    }
  }

  return list;
}

/**
 * Fetch User's Own Uploaded Past Questions
 */
export async function fetchUserPastQuestions(userId: string): Promise<PastQuestion[]> {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, PAST_QUESTIONS_COLLECTION),
      where('uploadedBy', '==', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PastQuestion));
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (err) {
    console.warn('Error fetching user past questions:', err);
    return [];
  }
}

/**
 * Fetch All Past Questions for Admin Moderation (Pending, Approved, Rejected)
 */
export async function fetchAllPastQuestionsForAdmin(statusFilter?: PastQuestionStatus | 'all'): Promise<PastQuestion[]> {
  try {
    let q = query(collection(db, PAST_QUESTIONS_COLLECTION));
    if (statusFilter && statusFilter !== 'all') {
      q = query(collection(db, PAST_QUESTIONS_COLLECTION), where('status', '==', statusFilter));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PastQuestion));
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (err) {
    console.warn('Error fetching admin past questions:', err);
    return [];
  }
}

/**
 * Admin Moderation Action (Approve, Reject, Delete)
 */
export async function moderatePastQuestion(
  questionId: string,
  action: 'approve' | 'reject' | 'delete',
  reviewer: { uid: string; name: string },
  options?: { rejectionReason?: string; customGpReward?: number }
): Promise<{ success: boolean; message: string; gpAwarded?: number; error?: string }> {
  try {
    const docRef = doc(db, PAST_QUESTIONS_COLLECTION, questionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, message: 'Past question not found.', error: 'Past question not found.' };
    }

    const question = { id: snap.id, ...snap.data() } as PastQuestion;

    if (action === 'delete') {
      await deleteDoc(docRef);
      return { success: true, message: 'Past question deleted successfully.' };
    }

    if (action === 'reject') {
      const reason = options?.rejectionReason || 'Uploaded content does not match academic quality standards or is illegible.';
      await updateDoc(docRef, {
        status: 'rejected',
        reviewedBy: reviewer.uid,
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason,
      });

      // Send rejection notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: question.uploadedBy,
          title: 'Past Question Submission Update',
          message: `Your contribution for ${question.courseCode} (${question.academicSession}) was not approved. Reason: ${reason}`,
          type: 'academic_library',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      } catch {}

      return { success: true, message: 'Past question marked as rejected.' };
    }

    if (action === 'approve') {
      const settings = await fetchPastQuestionSettings();
      const gpReward = typeof options?.customGpReward === 'number' ? options.customGpReward : settings.uploadGpReward;

      // 1. Update past question document status
      await updateDoc(docRef, {
        status: 'approved',
        reviewedBy: reviewer.uid,
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
        gpAwarded: gpReward,
        rejectionReason: '',
      });

      // 2. Award GP to contributor's wallet
      if (gpReward > 0 && question.uploadedBy) {
        try {
          const userDocRef = doc(db, 'users', question.uploadedBy);
          await runTransaction(db, async (transaction) => {
            const uSnap = await transaction.get(userDocRef);
            let curGp = 0;
            if (uSnap.exists()) {
              const uData = uSnap.data();
              curGp = typeof uData.gpBalance === 'number' ? uData.gpBalance : Number(uData.gpBalance || 0);
            }
            transaction.set(userDocRef, { gpBalance: curGp + gpReward, updatedAt: serverTimestamp() }, { merge: true });
          });

          // 3. Record wallet transaction
          await recordWalletTransactionInFirestore({
            userId: question.uploadedBy,
            userName: question.uploadedByName,
            userEmail: question.uploadedByEmail,
            type: 'academic_contribution_reward',
            amount: gpReward,
            unit: 'GP',
            title: `Academic Reward: ${question.courseCode} Past Question`,
            description: `Contribution approved for ${question.institutionName} (${question.courseCode} - ${question.academicSession}). Reward of +${gpReward} GP credited.`,
            isCredit: true,
            status: 'completed',
            adminUid: reviewer.uid,
            adminName: reviewer.name,
            meta: {
              questionId: question.id,
              courseCode: question.courseCode,
              institution: question.institutionName,
            },
          });

          // 4. Send reward notification
          await addDoc(collection(db, 'notifications'), {
            userId: question.uploadedBy,
            title: '🎉 Achievement: Contribution Approved! GP Awarded',
            message: `Congratulations! Your past question for ${question.courseCode} (${question.academicSession}) has been verified by faculty arbiters. +${gpReward} GP has been credited to your wallet!`,
            type: 'academic_library',
            actionUrl: 'wallet:history',
            isRead: false,
            createdAt: serverTimestamp(),
            createdAtMillis: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (walletErr) {
          console.warn('Notice: Could not complete wallet transaction for reward:', walletErr);
        }
      }

      return {
        success: true,
        message: `Past question approved! ${gpReward > 0 ? `+${gpReward} GP awarded to ${question.uploadedByName}.` : ''}`,
        gpAwarded: gpReward,
      };
    }

    return { success: false, message: 'Unknown moderation action.', error: 'Unknown moderation action.' };
  } catch (err: any) {
    console.error('Error during past question moderation:', err);
    return { success: false, message: err?.message || 'Failed to complete moderation.', error: err?.message || 'Failed to complete moderation.' };
  }
}

/**
 * Check and Record Daily View Limits
 */
export async function checkAndRecordPastQuestionView(
  userId: string,
  questionId: string,
  userTier: 'free' | 'premium' | 'vip' = 'free'
): Promise<{
  allowed: boolean;
  viewsToday: number;
  dailyLimit: number | 'unlimited';
  remainingViews: number | 'unlimited';
  reason?: string;
  message?: string;
}> {
  const settings = await fetchPastQuestionSettings();
  let dailyLimit: number | 'unlimited' = settings.freeDailyViewLimit;
  if (userTier === 'vip') {
    dailyLimit = settings.vipDailyViewLimit;
  } else if (userTier === 'premium') {
    dailyLimit = settings.premiumDailyViewLimit;
  }

  const isUnlimited = dailyLimit === 'unlimited';
  const todayKey = getTodayDateKey();

  // If user is VIP / unlimited, grant instantaneous access and log view asynchronously in background
  if (isUnlimited && userId) {
    const viewDocRef = doc(collection(db, PAST_QUESTION_VIEWS_COLLECTION));
    setDoc(viewDocRef, {
      userId,
      questionId,
      date: todayKey,
      viewedAt: new Date().toISOString(),
      userTier,
    }).catch(() => {});

    try {
      const qRef = doc(db, PAST_QUESTIONS_COLLECTION, questionId);
      updateDoc(qRef, { viewsCount: increment(1) }).catch(() => {});
    } catch {}

    return {
      allowed: true,
      viewsToday: 0,
      dailyLimit: 'unlimited',
      remainingViews: 'unlimited',
    };
  }

  // If user is guest/no ID, let them view up to 2 previews locally
  if (!userId) {
    const localGuestKey = `grobax_guest_views_${todayKey}`;
    const guestViews = Number(localStorage.getItem(localGuestKey) || '0');
    if (guestViews >= 2) {
      return {
        allowed: false,
        viewsToday: guestViews,
        dailyLimit: 2,
        remainingViews: 0,
        reason: 'LOGIN_REQUIRED',
        message: 'You have viewed 2 free preview past questions today. Sign in to access your full daily quota!',
      };
    }
    localStorage.setItem(localGuestKey, String(guestViews + 1));
    return {
      allowed: true,
      viewsToday: guestViews + 1,
      dailyLimit: 2,
      remainingViews: Math.max(0, 2 - (guestViews + 1)),
    };
  }

  try {
    // Count views today for this user
    const q = query(
      collection(db, PAST_QUESTION_VIEWS_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', todayKey)
    );
    const snap = await getDocs(q);
    const viewsToday = snap.size;

    // Check if already viewed THIS specific question today (free re-views of the same question on the same day)
    const alreadyViewedThis = snap.docs.some((d) => d.data().questionId === questionId);

    if (!alreadyViewedThis && !isUnlimited && viewsToday >= (dailyLimit as number)) {
      return {
        allowed: false,
        viewsToday,
        dailyLimit,
        remainingViews: 0,
        reason: 'DAILY_LIMIT_REACHED',
        message: `You have reached your daily viewing limit of ${dailyLimit} past questions on the ${userTier.toUpperCase()} tier. Upgrade to Premium or VIP to unlock higher quotas!`,
      };
    }

    // Record view if not already logged today
    if (!alreadyViewedThis) {
      const viewDocRef = doc(collection(db, PAST_QUESTION_VIEWS_COLLECTION));
      await setDoc(viewDocRef, {
        userId,
        questionId,
        date: todayKey,
        viewedAt: new Date().toISOString(),
        userTier,
      });

      // 1. Increment views count on past question document
      try {
        const qRef = doc(db, PAST_QUESTIONS_COLLECTION, questionId);
        await updateDoc(qRef, { viewsCount: increment(1) });
      } catch {}

      // 2. Count views on user profile for academic engagement & upgrade tracking (No rewards are given for viewing)
      if (userId) {
        try {
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            pastQuestionViewsCount: increment(1),
            totalPqViews: increment(1),
            lastPqViewedAt: serverTimestamp(),
          });
        } catch {}
      }
    }

    const newViewsCount = alreadyViewedThis ? viewsToday : viewsToday + 1;
    return {
      allowed: true,
      viewsToday: newViewsCount,
      dailyLimit,
      remainingViews: isUnlimited ? 'unlimited' : Math.max(0, (dailyLimit as number) - newViewsCount),
    };
  } catch (err) {
    console.warn('Error verifying view limits in Firestore:', err);
    // Fallback to local storage
    const localKey = `grobax_pq_views_${userId}_${todayKey}`;
    const localViews = Number(localStorage.getItem(localKey) || '0');
    if (!isUnlimited && localViews >= (dailyLimit as number)) {
      return {
        allowed: false,
        viewsToday: localViews,
        dailyLimit,
        remainingViews: 0,
        reason: 'DAILY_LIMIT_REACHED',
        message: `Daily limit of ${dailyLimit} past questions reached for today.`,
      };
    }
    localStorage.setItem(localKey, String(localViews + 1));
    return {
      allowed: true,
      viewsToday: localViews + 1,
      dailyLimit,
      remainingViews: isUnlimited ? 'unlimited' : Math.max(0, (dailyLimit as number) - (localViews + 1)),
    };
  }
}

/**
 * Fetch User's Daily View Quota & Viewed Question IDs without incrementing
 */
export async function fetchUserDailyViewQuota(
  userId: string,
  userTier: 'free' | 'premium' | 'vip' = 'free'
): Promise<{
  viewsToday: number;
  dailyLimit: number | 'unlimited';
  remainingViews: number | 'unlimited';
  viewedQuestionIdsToday: string[];
  isLimitReached: boolean;
}> {
  const settings = await fetchPastQuestionSettings();
  let dailyLimit: number | 'unlimited' = settings.freeDailyViewLimit;
  if (userTier === 'vip') {
    dailyLimit = settings.vipDailyViewLimit;
  } else if (userTier === 'premium') {
    dailyLimit = settings.premiumDailyViewLimit;
  }

  const isUnlimited = dailyLimit === 'unlimited';
  const todayKey = getTodayDateKey();

  if (!userId) {
    const localGuestKey = `grobax_guest_views_${todayKey}`;
    const guestViews = Number(localStorage.getItem(localGuestKey) || '0');
    return {
      viewsToday: guestViews,
      dailyLimit: 2,
      remainingViews: Math.max(0, 2 - guestViews),
      viewedQuestionIdsToday: [],
      isLimitReached: guestViews >= 2,
    };
  }

  try {
    const q = query(
      collection(db, PAST_QUESTION_VIEWS_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', todayKey)
    );
    const snap = await getDocs(q);
    const viewedQuestionIdsToday = snap.docs.map((d) => d.data().questionId as string);
    const viewsToday = snap.size;
    const isLimitReached = !isUnlimited && viewsToday >= (dailyLimit as number);

    return {
      viewsToday,
      dailyLimit,
      remainingViews: isUnlimited ? 'unlimited' : Math.max(0, (dailyLimit as number) - viewsToday),
      viewedQuestionIdsToday,
      isLimitReached,
    };
  } catch (err) {
    console.warn('Error fetching daily view quota from Firestore:', err);
    const localKey = `grobax_pq_views_${userId}_${todayKey}`;
    const localViews = Number(localStorage.getItem(localKey) || '0');
    const isLimitReached = !isUnlimited && localViews >= (dailyLimit as number);
    return {
      viewsToday: localViews,
      dailyLimit,
      remainingViews: isUnlimited ? 'unlimited' : Math.max(0, (dailyLimit as number) - localViews),
      viewedQuestionIdsToday: [],
      isLimitReached,
    };
  }
}

/**
 * Toggle Bookmark on a Past Question
 */
export async function togglePastQuestionBookmark(userId: string, questionId: string): Promise<boolean> {
  if (!userId || !questionId) return false;
  const bookmarkId = `${userId}_${questionId}`;
  const docRef = doc(db, PAST_QUESTION_BOOKMARKS_COLLECTION, bookmarkId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
      // Decrement question bookmark counter
      try {
        await updateDoc(doc(db, PAST_QUESTIONS_COLLECTION, questionId), {
          bookmarksCount: increment(-1),
        });
      } catch {}
      return false; // Removed
    } else {
      await setDoc(docRef, {
        userId,
        questionId,
        createdAt: new Date().toISOString(),
      });
      try {
        await updateDoc(doc(db, PAST_QUESTIONS_COLLECTION, questionId), {
          bookmarksCount: increment(1),
        });
      } catch {}
      return true; // Added
    }
  } catch (err) {
    console.warn('Error toggling bookmark:', err);
    return false;
  }
}

/**
 * Fetch User Bookmarked Question IDs
 */
export async function fetchUserBookmarkedQuestionIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, PAST_QUESTION_BOOKMARKS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().questionId as string);
  } catch (err) {
    console.warn('Error fetching bookmarks:', err);
    return [];
  }
}

/**
 * Sample Verified Starter Past Questions
 * Populated automatically if database is empty so students have immediate verified content
 */
export const SAMPLE_VERIFIED_PAST_QUESTIONS: Omit<PastQuestion, 'id'>[] = [
  {
    institutionId: 'unilag',
    institutionName: 'University of Lagos (UNILAG)',
    institutionCategory: 'University',
    facultyName: 'Faculty of Science & Computing',
    departmentName: 'Computer Science',
    level: '200 Level (Sophomore)',
    courseCode: 'CSC 201',
    courseTitle: 'Computer Programming I (Structured C & Data Rep)',
    academicSession: '2023/2024',
    semester: '1st Semester',
    examType: 'Main Examination',
    fileUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
    fileUrls: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1200&auto=format&fit=crop',
    ],
    fileName: 'UNILAG_CSC201_2023_2024_1st_Semester.pdf',
    fileType: 'image',
    pagesCount: 2,
    description: 'Official UNILAG Degree Examination with Question 1 (Pointers & Memory Allocation), Question 2 (Binary Search Trees), and Section B algorithmic logic questions.',
    lecturerName: 'Dr. O. A. Adebayo',
    uploadedBy: 'system_curator',
    uploadedByName: 'GROBAAX Academic Curator',
    uploadedByEmail: 'curator@grobaax.ng',
    uploadedAt: '2025-01-15T10:00:00.000Z',
    status: 'approved',
    reviewedBy: 'system_admin',
    reviewedByName: 'Chief Academic Moderator',
    reviewedAt: '2025-01-15T11:00:00.000Z',
    gpAwarded: 50,
    viewsCount: 142,
    bookmarksCount: 38,
    compositeKey: 'unilag_computerscience_200levelsophomore_csc201_20232024_1stsemester',
  },
  {
    institutionId: 'ui',
    institutionName: 'University of Ibadan (UI)',
    institutionCategory: 'University',
    facultyName: 'Faculty of Science & Computing',
    departmentName: 'Mathematics & Statistics',
    level: '100 Level (Freshman)',
    courseCode: 'MTH 101',
    courseTitle: 'Elementary Mathematics I (Algebra & Trigonometry)',
    academicSession: '2023/2024',
    semester: '1st Semester',
    examType: 'Main Examination',
    fileUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
    fileUrls: [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
    ],
    fileName: 'UI_MTH101_2023_2024.pdf',
    fileType: 'image',
    pagesCount: 1,
    description: 'University of Ibadan General Faculty of Science & Engineering 100L Math Exam. Covers De Moivre Theorem, Binomial expansions, Partial fractions, and Determinants.',
    lecturerName: 'Prof. G. K. Babalola',
    uploadedBy: 'system_curator',
    uploadedByName: 'GROBAAX Academic Curator',
    uploadedByEmail: 'curator@grobaax.ng',
    uploadedAt: '2025-01-18T14:30:00.000Z',
    status: 'approved',
    reviewedBy: 'system_admin',
    reviewedByName: 'Chief Academic Moderator',
    reviewedAt: '2025-01-18T15:00:00.000Z',
    gpAwarded: 50,
    viewsCount: 215,
    bookmarksCount: 54,
    compositeKey: 'ui_mathematicsstatistics_100levelfreshman_mth101_20232024_1stsemester',
  },
  {
    institutionId: 'futa',
    institutionName: 'Federal University of Technology, Akure (FUTA)',
    institutionCategory: 'University',
    facultyName: 'Faculty of Engineering & Technology',
    departmentName: 'Mechanical Engineering',
    level: '300 Level (Junior)',
    courseCode: 'MEE 311',
    courseTitle: 'Applied Engineering Thermodynamics I',
    academicSession: '2022/2023',
    semester: '1st Semester',
    examType: 'Main Examination',
    fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200&auto=format&fit=crop',
    fileUrls: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=1200&auto=format&fit=crop',
    ],
    fileName: 'FUTA_MEE311_2022_2023.pdf',
    fileType: 'image',
    pagesCount: 2,
    description: 'FUTA School of Engineering & Engineering Technology Degree Exam. Comprehensive questions on Rankine Cycle with Reheat, Steam Tables entropy computation, and Gas Turbines.',
    lecturerName: 'Engr. Dr. S. I. Falana',
    uploadedBy: 'system_curator',
    uploadedByName: 'GROBAAX Academic Curator',
    uploadedByEmail: 'curator@grobaax.ng',
    uploadedAt: '2025-01-20T09:15:00.000Z',
    status: 'approved',
    reviewedBy: 'system_admin',
    reviewedByName: 'Chief Academic Moderator',
    reviewedAt: '2025-01-20T10:00:00.000Z',
    gpAwarded: 50,
    viewsCount: 98,
    bookmarksCount: 27,
    compositeKey: 'futa_mechanicalengineering_300leveljunior_mee311_20222023_1stsemester',
  },
  {
    institutionId: 'yabatech',
    institutionName: 'Yaba College of Technology (YABATECH)',
    institutionCategory: 'Polytechnic',
    facultyName: 'School of Engineering Technology',
    departmentName: 'Electrical & Electronic Engineering Tech',
    level: 'ND II (National Diploma Year 2)',
    courseCode: 'EEC 232',
    courseTitle: 'Electrical Machines & Transformers I',
    academicSession: '2023/2024',
    semester: '1st Semester',
    examType: 'Main Examination',
    fileUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?q=80&w=1200&auto=format&fit=crop',
    fileUrls: [
      'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?q=80&w=1200&auto=format&fit=crop',
    ],
    fileName: 'YABATECH_EEC232_2023_2024.pdf',
    fileType: 'image',
    pagesCount: 1,
    description: 'YABATECH National Diploma II Examination on Single Phase Transformers, Open-Circuit and Short-Circuit test analysis, equivalent circuit parameter derivation, and cooling methods.',
    lecturerName: 'Engr. M. B. Sanusi',
    uploadedBy: 'system_curator',
    uploadedByName: 'GROBAAX Academic Curator',
    uploadedByEmail: 'curator@grobaax.ng',
    uploadedAt: '2025-01-25T11:45:00.000Z',
    status: 'approved',
    reviewedBy: 'system_admin',
    reviewedByName: 'Chief Academic Moderator',
    reviewedAt: '2025-01-25T12:30:00.000Z',
    gpAwarded: 50,
    viewsCount: 112,
    bookmarksCount: 31,
    compositeKey: 'yabatech_electricalelectronicengineeringtech_ndiinationaldiplomayear2_eec232_20232024_1stsemester',
  },
  {
    institutionId: 'lasu',
    institutionName: 'Lagos State University (LASU)',
    institutionCategory: 'University',
    facultyName: 'Faculty of Law & Jurisprudence',
    departmentName: 'Public & Private Law',
    level: '200 Level (Sophomore)',
    courseCode: 'LAW 201',
    courseTitle: 'Law of Contract I (Offer, Acceptance & Consideration)',
    academicSession: '2023/2024',
    semester: '1st Semester',
    examType: 'Main Examination',
    fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
    fileUrls: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
    ],
    fileName: 'LASU_LAW201_2023_2024.pdf',
    fileType: 'image',
    pagesCount: 1,
    description: 'LASU Faculty of Law Degree Examination. Case study problems examining Carlill v Carbolic Smoke Ball Co, Central London Property Trust v High Trees House, and doctrine of privity.',
    lecturerName: 'Barr. Dr. F. K. Alimi',
    uploadedBy: 'system_curator',
    uploadedByName: 'GROBAAX Academic Curator',
    uploadedByEmail: 'curator@grobaax.ng',
    uploadedAt: '2025-02-01T16:20:00.000Z',
    status: 'approved',
    reviewedBy: 'system_admin',
    reviewedByName: 'Chief Academic Moderator',
    reviewedAt: '2025-02-01T17:00:00.000Z',
    gpAwarded: 50,
    viewsCount: 178,
    bookmarksCount: 46,
    compositeKey: 'lasu_publicprivatelaw_200levelsophomore_law201_20232024_1stsemester',
  },
];

let _hasSeededThisSession = false;

/**
 * Ensures initial starter past questions exist if collection is empty (Non-blocking / cached check)
 */
export async function seedSamplePastQuestionsIfEmpty(): Promise<void> {
  if (_hasSeededThisSession) return;
  _hasSeededThisSession = true;

  try {
    const q = query(collection(db, PAST_QUESTIONS_COLLECTION), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      for (const sample of SAMPLE_VERIFIED_PAST_QUESTIONS) {
        const id = `PQ-INIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await setDoc(doc(db, PAST_QUESTIONS_COLLECTION, id), { id, ...sample });
      }
      clearApprovedQuestionsCache();
    }
  } catch (err) {
    console.warn('Could not seed initial past questions:', err);
  }
}
