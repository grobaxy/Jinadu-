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
  // gemini-3.1-flash-lite is highly available and fast, while gemini-3.8-flash serves as powerful fallback/alternate
  const models =
    options.candidateModels && options.candidateModels.length > 0
      ? options.candidateModels
      : ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  const timeoutMs = options.timeoutMs || 35000;

  for (const model of models) {
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

      if (isHighDemand) {
        console.info(`[Gemini Service] Model ${model} is experiencing high demand (503). Auto-failing over to next available candidate...`);
        // Immediately failover to next model without delay
        continue;
      }

      const isRateLimited = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
      if (isRateLimited) {
        console.info(`[Gemini Service] Model ${model} rate limited (429). Auto-failing over...`);
        await sleep(500);
        continue;
      }

      console.info(`[Gemini Service] Model ${model} request note:`, errMsg.slice(0, 150));
    }
  }

  console.error('[Gemini Service] All candidate models exhausted without successful response.');
  return null;
}
