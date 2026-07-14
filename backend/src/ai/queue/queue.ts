import { Queue } from 'bullmq';
import { config } from '../../config/env';
import { QUEUE_NAMES } from '../../config/constants';
import { logger } from '../../shared/logger';
import type { AiAnalysisJobData } from '../../types/domain.types';

/**
 * ai/queue/queue.ts — BullMQ queue definition for 'ai-analysis'.
 * Shared by both producer and consumer.
 */

export const aiAnalysisQueue = new Queue<AiAnalysisJobData>(QUEUE_NAMES.AI_ANALYSIS, {
  connection: {
    url: config.REDIS_URL,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s → 10s → 20s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

aiAnalysisQueue.on('error', (err) => {
  logger.error('BullMQ queue error', { queue: QUEUE_NAMES.AI_ANALYSIS, error: err.message });
});
