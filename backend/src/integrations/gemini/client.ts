import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';

/**
 * integrations/gemini/client.ts — Shared base Gemini SDK client.
 *
 * Single instantiation of GoogleGenerativeAI, shared across all three
 * use-case modules (vision, chat, translation). Each module calls
 * getModel() with its own model name from config.
 */

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');
  }
  return _client;
}

/**
 * Returns a configured GenerativeModel instance.
 * @param modelName  The model name from config (e.g. config.GEMINI_VISION_MODEL)
 */
export function getModel(modelName: string) {
  return getClient().getGenerativeModel({ model: modelName });
}
