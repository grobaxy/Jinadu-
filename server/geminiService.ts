import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGeminiApi(options: {
  prompt: string;
  responseMimeType?: string;
  temperature?: number;
  candidateModels?: string[];
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.error('[Gemini Service] Missing valid GEMINI_API_KEY');
    return null;
  }

  const ai = getAiClient();
  // High-availability candidate cascade prioritizing low-latency, resilient models
  const defaultCandidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  const models =
    options.candidateModels && options.candidateModels.length > 0
      ? options.candidateModels
      : defaultCandidateModels;

  const timeoutMs = options.timeoutMs || 35000;

  for (const model of models) {
    // Attempt each candidate model up to 2 times with backoff on 503/429
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: options.prompt,
          config: {
            responseMimeType: (options.responseMimeType as any) || 'application/json',
            temperature: options.temperature ?? 0.2,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)), timeoutMs)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isHighDemand =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE');

        const isRateLimited = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');

        if (isHighDemand || isRateLimited) {
          if (attempt === 1) {
            console.info(`[Gemini Service] Model ${model} returned ${isHighDemand ? '503 High Demand' : '429 Rate Limit'}. Backing off briefly and retrying...`);
            await sleep(800 + Math.random() * 400);
            continue;
          } else {
            console.info(`[Gemini Service] Model ${model} busy on retry. Cascading to next candidate...`);
            break;
          }
        }

        console.info(`[Gemini Service] Model ${model} request note:`, errMsg.slice(0, 150));
        break; // Non-retryable error, advance to next model
      }
    }
  }

  console.error('[Gemini Service] All candidate models exhausted without successful response.');
  return null;
}
