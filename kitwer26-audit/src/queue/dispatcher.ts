/**
 * Worker dispatcher: routes incoming jobs to the correct worker handler.
 */

import { Job } from 'bullmq';
import { AuditQueueJobData } from './setup.js';
import { runScannerWorker } from '../workers/scanner.js';
import { runFixWorker } from '../workers/fix.js';
import { runReauditWorker } from '../workers/reaudit.js';

export async function dispatchJob(job: Job<AuditQueueJobData>): Promise<void> {
  const { type } = job.data;

  switch (type) {
    case 'audit_job':
      await runScannerWorker(job.data);
      break;
    case 'fix_job':
      await runFixWorker(job.data);
      break;
    case 'recheck_job':
      await runReauditWorker(job.data);
      break;
    default: {
      const _exhaustive: never = type;
      throw new Error(`[dispatcher] Unknown job type: ${_exhaustive}`);
    }
  }
}
