import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { callGeminiApi } from './geminiService';
import {
  HandoutDailyLimitConfig,
  HandoutAdminStats,
  HandoutUserQuotaInfo,
  GeneratedHandout,
  HandoutInstitutionCategory,
} from '../src/types';

export const libraryRouter = Router();

// ==========================================
// PERSISTENT SERVER CACHE & DEFAULTS
// ==========================================

const DATA_FILE = path.join(process.cwd(), 'server', 'handout_library_data.json');

interface HandoutLibraryState {
  settings: HandoutDailyLimitConfig;
  stats: HandoutAdminStats;
  // Key format: `${userId}_${dateKey}`
  dailyUsage: Record<string, { count: number; tier: 'free' | 'premium' | 'vip'; lastGeneratedAt: string }>;
  monthTrackKey: string; // YYYY-MM
  todayTrackKey: string; // YYYY-MM-DD
}

const DEFAULT_SETTINGS: HandoutDailyLimitConfig = {
  freeDailyLimit: 2,
  premiumDailyLimit: 30,
  vipDailyLimit: 'unlimited',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

const DEFAULT_STATS: HandoutAdminStats = {
  totalGenerated: 0,
  generatedToday: 0,
  generatedThisMonth: 0,
  freeGenerations: 0,
  premiumGenerations: 0,
  vipGenerations: 0,
  lastUpdated: new Date().toISOString(),
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

let state: HandoutLibraryState = {
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  dailyUsage: {},
  monthTrackKey: getMonthKey(),
  todayTrackKey: getTodayKey(),
};

// Load state from file if exists
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state = {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          stats: { ...DEFAULT_STATS, ...parsed.stats },
          dailyUsage: parsed.dailyUsage || {},
          monthTrackKey: parsed.monthTrackKey || getMonthKey(),
          todayTrackKey: parsed.todayTrackKey || getTodayKey(),
        };
      }
    }
  } catch (err) {
    console.warn('[AI Handout Server] Error loading persistent handout state:', err);
  }
}

// Save state to file
function saveState() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AI Handout Server] Error saving handout state:', err);
  }
}

// Roll date & month counters
function checkAndRollCounters() {
  const currentDay = getTodayKey();
  const currentMonth = getMonthKey();

  if (state.todayTrackKey !== currentDay) {
    state.todayTrackKey = currentDay;
    state.stats.generatedToday = 0;
  }

  if (state.monthTrackKey !== currentMonth) {
    state.monthTrackKey = currentMonth;
    state.stats.generatedThisMonth = 0;
  }
}

// Initial load
loadState();
checkAndRollCounters();

// Concurrency locks to prevent duplicate submissions per user
const activeUserLocks = new Set<string>();

// Helper to determine numerical limit for a tier
function getLimitForTier(tier: 'free' | 'premium' | 'vip', settings: HandoutDailyLimitConfig): number | 'unlimited' {
  if (tier === 'vip') {
    return settings.vipDailyLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(settings.vipDailyLimit) || 100);
  }
  if (tier === 'premium') {
    return Math.max(1, Number(settings.premiumDailyLimit) || 30);
  }
  return Math.max(1, Number(settings.freeDailyLimit) || 2);
}

// Helper to get user's today generation count
function getUserTodayCount(userId: string, dateKey: string): number {
  const key = `${userId}_${dateKey}`;
  return state.dailyUsage[key]?.count || 0;
}

// ==========================================
// ROUTES
// ==========================================

/**
 * GET /api/library/settings
 * Read current generation limits
 */
libraryRouter.get('/settings', (_req: Request, res: Response) => {
  checkAndRollCounters();
  return res.json({
    success: true,
    settings: state.settings,
  });
});

/**
 * POST /api/library/settings
 * Admin updates generation limits
 */
libraryRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { freeDailyLimit, premiumDailyLimit, vipDailyLimit, updatedBy } = req.body || {};

    const newFree = Math.max(1, Number(freeDailyLimit) || state.settings.freeDailyLimit || 2);
    const newPremium = Math.max(1, Number(premiumDailyLimit) || state.settings.premiumDailyLimit || 30);
    const newVip = vipDailyLimit === 'unlimited'
      ? 'unlimited'
      : Math.max(1, Number(vipDailyLimit) || 50);

    state.settings = {
      freeDailyLimit: newFree,
      premiumDailyLimit: newPremium,
      vipDailyLimit: newVip,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Super Admin',
    };

    saveState();

    return res.json({
      success: true,
      settings: state.settings,
      message: 'AI Handout generation limits successfully updated.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update handout settings.',
    });
  }
});

/**
 * GET /api/library/stats
 * Management and usage statistics
 */
libraryRouter.get('/stats', (_req: Request, res: Response) => {
  checkAndRollCounters();
  return res.json({
    success: true,
    stats: {
      ...state.stats,
      currentLimits: state.settings,
    },
  });
});

/**
 * GET /api/library/quota
 * Query user's current daily quota
 */
libraryRouter.get('/quota', (req: Request, res: Response) => {
  try {
    checkAndRollCounters();
    const userId = String(req.query.userId || '');
    const tierRaw = String(req.query.tier || 'free').toLowerCase();
    const tier: 'free' | 'premium' | 'vip' =
      tierRaw === 'vip' ? 'vip' : tierRaw === 'premium' ? 'premium' : 'free';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const dateKey = getTodayKey();
    const todayCount = getUserTodayCount(userId, dateKey);
    const dailyLimit = getLimitForTier(tier, state.settings);

    const canGenerate = dailyLimit === 'unlimited' ? true : todayCount < dailyLimit;
    const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - todayCount);

    const quotaInfo: HandoutUserQuotaInfo = {
      tier,
      todayCount,
      dailyLimit,
      remaining,
      canGenerate,
      dateKey,
    };

    return res.json({
      success: true,
      quota: quotaInfo,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch quota.' });
  }
});

/**
 * POST /api/library/generate-handout
 * Real AI generation service with server-side limit enforcement
 */
libraryRouter.post('/generate-handout', async (req: Request, res: Response) => {
  const {
    userId,
    userEmail,
    userDisplayName,
    tier = 'free',
    institutionType = 'University',
    institution,
    faculty,
    department,
    level,
    course,
    topic,
    additionalInstruction = '',
  } = req.body || {};

  // 1. Authenticate / Validate inputs
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User authentication required.' });
  }

  if (!institution || !faculty || !department || !level || !course || !topic) {
    return res.status(400).json({
      success: false,
      error: 'Please specify the Institution, Faculty, Department, Level, Course, and Topic to generate a handout.',
    });
  }

  // 2. Check concurrency lock
  if (activeUserLocks.has(userId)) {
    return res.status(429).json({
      success: false,
      error: 'A handout generation is already in progress for your account. Please wait a moment.',
    });
  }

  // 3. Determine user's subscription tier
  const normalizedTier: 'free' | 'premium' | 'vip' =
    String(tier).toLowerCase() === 'vip'
      ? 'vip'
      : String(tier).toLowerCase() === 'premium'
      ? 'premium'
      : 'free';

  checkAndRollCounters();
  const dateKey = getTodayKey();
  const currentCount = getUserTodayCount(userId, dateKey);
  const dailyLimit = getLimitForTier(normalizedTier, state.settings);

  // 4. Server-Side Daily Limit Check
  if (dailyLimit !== 'unlimited' && currentCount >= dailyLimit) {
    const upgradePrompt =
      normalizedTier === 'free'
        ? `You've used your ${dailyLimit} free handouts for today. Upgrade to Premium to generate up to ${state.settings.premiumDailyLimit} handouts every day.`
        : `You've reached your Premium handout limit (${dailyLimit} handouts) for today. Upgrade to VIP for unlimited handout generation.`;

    return res.status(429).json({
      success: false,
      limitReached: true,
      error: upgradePrompt,
      tier: normalizedTier,
      todayCount: currentCount,
      dailyLimit,
      remaining: 0,
    });
  }

  // Set lock
  activeUserLocks.add(userId);
  const startTime = Date.now();

  try {
    console.log(
      `[AI Handout] Generating for ${userId} (${normalizedTier}): "${topic}" in ${course} [${level} - ${department}, ${institution}]`
    );

    // 5. Construct comprehensive academic generation prompt
    const prompt = `You are a distinguished Nigerian University Professor, Chief Academic Examiner, and Textbook Author across Nigerian Universities, Polytechnics, and Colleges of Education.

GENERATE A COMPREHENSIVE, COMPLETE, AND ACADEMICALLY RIGOROUS EDUCATIONAL HANDOUT for Nigerian tertiary students studying this exact academic curriculum context.

ACADEMIC CONTEXT:
- Institution Category: ${institutionType}
- Institution: ${institution}
- Faculty / School: ${faculty}
- Department: ${department}
- Academic Level: ${level}
- Course: ${course}
- Specific Topic: ${topic}
${additionalInstruction ? `- Specific Student Directives: ${additionalInstruction}` : ''}

QUALITY & PEDAGOGICAL INSTRUCTIONS:
1. Clear, authoritative academic English appropriate for Nigerian tertiary education (NUC, NBTE, NCCE standards).
2. DO NOT generate short summaries or superficial paragraphs. Generate a thorough, study-grade educational handout.
3. For Science/Engineering/Technology courses: include governing scientific laws, clear LaTeX formulas with parameter definitions, principles, and step-by-step worked mathematical/engineering calculations.
4. For Humanities, Law, Arts, or Social Sciences: include foundational theories, historical/philosophical context, statutory references (where relevant), analytical frameworks, and practical Nigerian case examples.
5. Never invent false facts, non-existent laws, or fictitious formulas.
6. Return a STRICT, VALID JSON object conforming exactly to the schema below.

JSON SCHEMA:
{
  "title": "Clear, comprehensive academic title of the handout",
  "learningObjectives": [
    "At least 4 to 6 specific, measurable learning objectives using Bloom's Taxonomy verbs (e.g., Define, Explain, Calculate, Analyze, Differentiate, Apply)"
  ],
  "introduction": "A substantive academic introduction setting theoretical context and relevance (at least 2 thorough paragraphs)",
  "mainConcepts": [
    "Core Concept 1: Description",
    "Core Concept 2: Description",
    "Core Concept 3: Description",
    "Core Concept 4: Description"
  ],
  "sections": [
    {
      "title": "Module / Section 1 Title",
      "content": "Detailed, deep educational explanation with full academic rigor (at least 2-3 substantive paragraphs)",
      "bulletPoints": ["Key sub-points and structural breakdown"],
      "formulas": ["Governing LaTeX formulas/equations if technical/quantitative, e.g., 'E = mc^2' or 'V = IR'"],
      "keyTakeaway": "Essential academic conclusion for this module"
    },
    {
      "title": "Module / Section 2 Title",
      "content": "Detailed academic explanation continuing the curriculum breakdown",
      "bulletPoints": ["Key sub-points"],
      "formulas": [],
      "keyTakeaway": "Essential academic takeaway"
    },
    {
      "title": "Module / Section 3 Title",
      "content": "Advanced conceptual breakdown, mechanisms, derivations, or analytical arguments",
      "bulletPoints": ["Key sub-points"],
      "formulas": [],
      "keyTakeaway": "Essential academic takeaway"
    },
    {
      "title": "Module / Section 4 Title",
      "content": "Applied principles, boundary conditions, or procedural implementations",
      "bulletPoints": ["Key sub-points"],
      "formulas": [],
      "keyTakeaway": "Essential academic takeaway"
    }
  ],
  "importantDefinitions": [
    { "term": "Key Academic Term 1", "definition": "Exact authoritative definition" },
    { "term": "Key Academic Term 2", "definition": "Exact authoritative definition" },
    { "term": "Key Academic Term 3", "definition": "Exact authoritative definition" },
    { "term": "Key Academic Term 4", "definition": "Exact authoritative definition" }
  ],
  "relevantExamples": [
    {
      "title": "Concrete Worked Example / Case Study 1",
      "scenarioOrProblem": "Realistic problem statement, engineering scenario, or practical case",
      "explanationOrSolution": "Full step-by-step solution, calculation, or analysis showing standard methodology"
    },
    {
      "title": "Concrete Worked Example / Case Study 2",
      "scenarioOrProblem": "Realistic scenario or problem statement",
      "explanationOrSolution": "Full step-by-step solution, calculation, or analysis"
    }
  ],
  "practicalApplications": [
    "Specific application in Nigerian industries, infrastructure, governance, or professional practice",
    "Second practical application"
  ],
  "keyPointsToRemember": [
    "Crucial exam and revision takeaway 1",
    "Crucial exam and revision takeaway 2",
    "Crucial exam and revision takeaway 3",
    "Crucial exam and revision takeaway 4"
  ],
  "summary": "Comprehensive academic synthesis summarizing all major insights covered in the handout",
  "reviewQuestions": [
    {
      "question": "Standard Nigerian tertiary exam question 1 (e.g., conceptual/definition question)",
      "type": "short_answer",
      "modelAnswerOrHint": "Model outline or key points expected by academic examiners"
    },
    {
      "question": "Exam question 2 (e.g., analytical/calculation/essay question)",
      "type": "essay",
      "modelAnswerOrHint": "Marking scheme guidelines and step-by-step points"
    },
    {
      "question": "Exam question 3 (e.g., applied problem solving question)",
      "type": "calculation",
      "modelAnswerOrHint": "Methodology, formula to apply, and final verification"
    }
  ]
}

Ensure all JSON strings are properly escaped. Return RAW VALID JSON ONLY with no extra commentary or markdown formatting outside the JSON object.`;

    // 6. Real Gemini API call
    const rawResult = await callGeminiApi({
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.2,
      candidateModels: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
      timeoutMs: 40000,
    });

    if (!rawResult) {
      // AI failed - Do NOT consume allowance
      console.error('[AI Handout] Gemini API returned empty or failed to respond.');
      return res.status(502).json({
        success: false,
        error:
          'The AI generation service is momentarily busy. Please try again. Your daily generation allowance was not consumed.',
      });
    }

    // 7. Parse and validate JSON structure
    let parsed: any;
    try {
      parsed = JSON.parse(rawResult);
    } catch {
      const cleaned = rawResult
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    }

    if (!parsed || !parsed.title || !Array.isArray(parsed.sections)) {
      throw new Error('AI response did not match the expected handout schema.');
    }

    // 8. Construct authoritative handout object
    const handoutId = `handout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const durationMs = Date.now() - startTime;

    const completedHandout: GeneratedHandout = {
      id: handoutId,
      userId,
      userEmail: userEmail || '',
      userDisplayName: userDisplayName || '',
      institutionType: institutionType as HandoutInstitutionCategory,
      institution,
      faculty,
      department,
      level,
      course,
      topic,
      additionalInstruction: additionalInstruction || undefined,
      title: parsed.title || `${topic} - Academic Handout`,
      learningObjectives: Array.isArray(parsed.learningObjectives) ? parsed.learningObjectives : [],
      introduction: parsed.introduction || '',
      mainConcepts: Array.isArray(parsed.mainConcepts) ? parsed.mainConcepts : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      relevantExamples: Array.isArray(parsed.relevantExamples) ? parsed.relevantExamples : [],
      practicalApplications: Array.isArray(parsed.practicalApplications) ? parsed.practicalApplications : [],
      keyPointsToRemember: Array.isArray(parsed.keyPointsToRemember) ? parsed.keyPointsToRemember : [],
      summary: parsed.summary || '',
      reviewQuestions: Array.isArray(parsed.reviewQuestions) ? parsed.reviewQuestions : [],
      createdAt: new Date().toISOString(),
      tierAtGeneration: normalizedTier,
      generationDurationMs: durationMs,
    };

    // 9. Increment user's successful generation count ONLY now!
    const usageKey = `${userId}_${dateKey}`;
    const newCount = (state.dailyUsage[usageKey]?.count || 0) + 1;
    state.dailyUsage[usageKey] = {
      count: newCount,
      tier: normalizedTier,
      lastGeneratedAt: new Date().toISOString(),
    };

    // Update aggregate stats
    state.stats.totalGenerated += 1;
    state.stats.generatedToday += 1;
    state.stats.generatedThisMonth += 1;
    if (normalizedTier === 'vip') {
      state.stats.vipGenerations += 1;
    } else if (normalizedTier === 'premium') {
      state.stats.premiumGenerations += 1;
    } else {
      state.stats.freeGenerations += 1;
    }
    state.stats.lastUpdated = new Date().toISOString();

    saveState();

    const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - newCount);

    console.log(`[AI Handout] Successfully generated handout ${handoutId} for user ${userId} in ${durationMs}ms`);

    return res.json({
      success: true,
      handout: completedHandout,
      quota: {
        tier: normalizedTier,
        todayCount: newCount,
        dailyLimit,
        remaining,
        dateKey,
        canGenerate: dailyLimit === 'unlimited' ? true : newCount < dailyLimit,
      },
    });
  } catch (genError: any) {
    console.error('[AI Handout] Generation error:', genError);
    // Do NOT increment usage allowance on failure
    return res.status(500).json({
      success: false,
      error: genError?.message || 'Failed to generate academic handout. Your daily allowance was not consumed.',
    });
  } finally {
    activeUserLocks.delete(userId);
  }
});
