import OpenAI from 'openai';
import env from './env.mjs';
import AppError from '../utils/AppError.mjs';

let openaiClient = null;

export function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  if (!env.openai.apiKey) {
    throw new AppError('OPENAI_API_KEY is not set', 500);
  }

  openaiClient = new OpenAI({ apiKey: env.openai.apiKey });
  return openaiClient;
}
