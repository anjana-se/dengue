import { aiAnalysisQueue } from '../src/ai/queue/queue';

/**
 * reset_ai_queue.ts
 *
 * Sample script to reset / obliterate the BullMQ AI Analysis Queue in Redis.
 * Useful for purging stuck, failed, or pending AI processing jobs during dev.
 *
 * Usage:
 *   npx ts-node scripts/reset_ai_queue.ts
 *   OR
 *   npm run reset:queue (if added to scripts)
 */
async function resetAiQueue() {
  console.log('🧹 Fetching AI analysis queue status from Redis...');

  try {
    const countsBefore = await aiAnalysisQueue.getJobCounts();
    console.log('📊 Current queue job counts:', countsBefore);

    console.log('🔥 Obliterating all jobs (waiting, active, completed, failed, delayed)...');
    await aiAnalysisQueue.obliterate({ force: true });

    const countsAfter = await aiAnalysisQueue.getJobCounts();
    console.log('✅ AI queue successfully reset!', countsAfter);
  } catch (err) {
    console.error('❌ Failed to reset AI queue:', err);
    process.exit(1);
  } finally {
    await aiAnalysisQueue.close();
    process.exit(0);
  }
}

resetAiQueue();
