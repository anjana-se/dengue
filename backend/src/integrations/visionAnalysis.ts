import { config } from '../config/env';
import { logger } from '../shared/logger';
import type { ParsedAnalysisResult } from './gemini/responseParser';
import { analyzeBreedingSiteImage as analyzeWithGemini } from './gemini/visionAnalysis';
import { analyzeBreedingSiteImageNvidia as analyzeWithNvidia } from './nvidia/visionAnalysis';

/**
 * integrations/visionAnalysis.ts
 *
 * Unified router function for breeding site vision analysis.
 * Dynamically routes requests to Gemini or NVIDIA NIM based on AI_PROVIDER config.
 */
export async function analyzeBreedingSiteImage(
  imagePath: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<ParsedAnalysisResult> {
  const provider = config.AI_PROVIDER;
  logger.info('Routing vision analysis request', { provider, imagePath });

  if (provider === 'nvidia') {
    return analyzeWithNvidia(imagePath, mimeType);
  } else {
    // Default fallback to gemini
    return analyzeWithGemini(imagePath, mimeType);
  }
}
