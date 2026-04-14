/**
 * BullMQ Queue setup and job type definitions.
 */

import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import { getRedis } from '../config/clients.js';
import { THRESHOLDS } from '../config/thresholds.js';

export const QUEUE_NAME = 'kitwer26-audit';

// ── Job payload types ─────────────────────────────────────────────────────────

export interface AuditJobData {
  type: 'audit_job';
  scanId: string;
  iteration: number;
  runId: string;
}

export interface FixJobData {
  type: 'fix_job';
  scanId: string;
  runId: string;
  findingIds: string[];
  dryRun: boolean;
}

export interface RecheckJobData {
  type: 'recheck_job';
  scanId: string;
  previousRunId: string;
  iteration: number;
}

export type AuditQueueJobData = AuditJobData | FixJobData | RecheckJobData;

// ── Queue factory ─────────────────────────────────────────────────────────────

let _queue: Queue<AuditQueueJobData> | null = null;

export function getQueue(): Queue<AuditQueueJobData> {
  if (!_queue) {
    const connection = getRedis() as unknown as ConnectionOptions;
    _queue = new Queue<AuditQueueJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: THRESHOLDS.WORKER_RETRY_LIMIT,
        backoff: {
          type: 'exponential',
          delay: THRESHOLDS.WORKER_BACKOFF_DELAY_MS,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _queue;
}

// ── Worker factory ────────────────────────────────────────────────────────────

export type JobProcessor = (job: Job<AuditQueueJobData>) => Promise<void>;

export function createWorker(processor: JobProcessor): Worker<AuditQueueJobData> {
  const connection = getRedis() as unknown as ConnectionOptions;
  const worker = new Worker<AuditQueueJobData>(QUEUE_NAME, processor, {
    connection,
    concurrency: 4,
  });

  worker.on('completed', (job) => {
    console.info(`[audit:worker] Job ${job.id} (${job.data.type}) completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[audit:worker] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

// ── Enqueue helpers ───────────────────────────────────────────────────────────

export async function enqueueAuditJob(data: AuditJobData): Promise<string> {
  const queue = getQueue();
  const job = await queue.add('audit_job', data, { priority: 1 });
  return job.id ?? '';
}

export async function enqueueFixJob(data: FixJobData): Promise<string> {
  const queue = getQueue();
  const job = await queue.add('fix_job', data, { priority: 2 });
  return job.id ?? '';
}

export async function enqueueRecheckJob(data: RecheckJobData): Promise<string> {
  const queue = getQueue();
  const job = await queue.add('recheck_job', data, { priority: 3 });
  return job.id ?? '';
}
