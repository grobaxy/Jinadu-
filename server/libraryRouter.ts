import { Router, Request, Response } from 'express';
import { PastQuestion, PastQuestionSettings } from '../src/types';

export const libraryRouter = Router();

// In-memory / server state caches (synced with Firestore on write)
const DEFAULT_SETTINGS: PastQuestionSettings = {
  enabled: true,
  uploadGpReward: 50,
  freeDailyViewLimit: 2,
  premiumDailyViewLimit: 10,
  vipDailyViewLimit: 'unlimited',
  allowUserUploads: true,
  requireVerification: true,
  maxUploadsPerWeek: 1,
  maxUploadsPerDay: 1,
};

let currentSettings: PastQuestionSettings = { ...DEFAULT_SETTINGS };

// Helper to get today's date string in WAT / YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper to get ISO week string YYYY-Www
function getYearWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Helper to generate composite unique key for duplicate detection
export function generatePastQuestionCompositeKey(
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

// GET /api/library/settings
libraryRouter.get('/settings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    settings: currentSettings,
  });
});

// POST /api/library/settings
libraryRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { settings } = req.body || {};
    if (settings && typeof settings === 'object') {
      const weeklyLimit = Math.max(1, Number(settings.maxUploadsPerWeek) || Number(settings.maxUploadsPerDay) || 1);
      currentSettings = {
        ...currentSettings,
        ...settings,
        uploadGpReward: Math.max(0, Number(settings.uploadGpReward) || 50),
        freeDailyViewLimit: Math.max(1, Number(settings.freeDailyViewLimit) || 2),
        premiumDailyViewLimit: Math.max(1, Number(settings.premiumDailyViewLimit) || 10),
        vipDailyViewLimit: settings.vipDailyViewLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(settings.vipDailyViewLimit) || 20),
        maxUploadsPerWeek: weeklyLimit,
        maxUploadsPerDay: weeklyLimit,
      };
      return res.json({
        success: true,
        settings: currentSettings,
        message: 'Past questions library settings updated successfully.',
      });
    }
    return res.status(400).json({ success: false, error: 'Invalid settings payload provided.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update settings.' });
  }
});

// POST /api/library/upload-check - Validate if user can upload this week
libraryRouter.post('/upload-check', (req: Request, res: Response) => {
  try {
    const { userId, weekUploadCount = 0, todayUploadCount = 0 } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const currentCount = Number(weekUploadCount !== undefined ? weekUploadCount : todayUploadCount) || 0;
    const maxAllowed = currentSettings.maxUploadsPerWeek || currentSettings.maxUploadsPerDay || 1;
    const canUpload = currentCount < maxAllowed;

    return res.json({
      success: true,
      canUpload,
      maxUploadsPerWeek: maxAllowed,
      maxUploadsPerDay: maxAllowed,
      weekUploadCount: currentCount,
      todayUploadCount: currentCount,
      remainingUploads: Math.max(0, maxAllowed - currentCount),
      allowUserUploads: currentSettings.allowUserUploads,
      currentWeek: getYearWeekKey(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server check failed.' });
  }
});

// POST /api/library/duplicate-check - Validate duplicate past question submission
libraryRouter.post('/duplicate-check', (req: Request, res: Response) => {
  try {
    const {
      institutionId,
      departmentName,
      level,
      courseCode,
      academicSession,
      semester,
    } = req.body || {};

    if (!institutionId || !departmentName || !level || !courseCode || !academicSession) {
      return res.status(400).json({ success: false, error: 'Missing required academic metadata.' });
    }

    const compositeKey = generatePastQuestionCompositeKey(
      institutionId,
      departmentName,
      level,
      courseCode,
      academicSession,
      semester || '1st Semester'
    );

    return res.json({
      success: true,
      compositeKey,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Duplicate check failed.' });
  }
});

// POST /api/library/view-check - Enforce daily view limits according to subscription tier
libraryRouter.post('/view-check', (req: Request, res: Response) => {
  try {
    const {
      userId,
      userTier = 'free', // 'free' | 'premium' | 'vip'
      viewsToday = 0,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required to verify viewing permissions.' });
    }

    let dailyLimit: number | 'unlimited' = currentSettings.freeDailyViewLimit;
    if (userTier === 'vip') {
      dailyLimit = currentSettings.vipDailyViewLimit;
    } else if (userTier === 'premium') {
      dailyLimit = currentSettings.premiumDailyViewLimit;
    }

    const currentCount = Number(viewsToday) || 0;
    const isUnlimited = dailyLimit === 'unlimited';
    const hasAccess = isUnlimited || currentCount < (dailyLimit as number);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        allowed: false,
        reason: 'DAILY_LIMIT_REACHED',
        userTier,
        dailyLimit,
        viewsToday: currentCount,
        message: `You have reached your daily limit of ${dailyLimit} past questions for your ${userTier.toUpperCase()} account. Upgrade your membership or check back tomorrow for a refreshed quota!`,
      });
    }

    return res.json({
      success: true,
      allowed: true,
      userTier,
      dailyLimit,
      viewsToday: currentCount,
      remainingViews: isUnlimited ? 'unlimited' : Math.max(0, (dailyLimit as number) - currentCount),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'View check failed.' });
  }
});

export default libraryRouter;
