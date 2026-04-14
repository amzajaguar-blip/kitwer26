/**
 * Environment validation at startup.
 * Throws immediately if required vars are missing.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load .env from the kitwer26-audit directory
config({ path: resolve(process.cwd(), '.env') });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  AUDIT_MAX_LOOPS: z.coerce.number().int().min(1).max(20).default(5),
  AUDIT_MIN_DELTA_PCT: z.coerce.number().min(0).max(100).default(1),
  AUDIT_DRY_RUN: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[audit] Environment validation failed:\n${issues}`);
  }
  return result.data;
}

export const env: Env = loadEnv();
