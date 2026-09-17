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
  const models = options.candidateModels && options.candidateModels.length > 0
    ? options.candidateModels
    : ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  const timeoutMs = options.timeoutMs || 35000;

  for (const model of models) {
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
        console.warn(`[Gemini Service] Model ${model} attempt ${attempt} warning:`, errMsg);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Timeout');

        if (isTransient && attempt < 2) {
          await sleep(500 * attempt);
        } else {
          break;
        }
      }
    }
  }

  return null;
}
