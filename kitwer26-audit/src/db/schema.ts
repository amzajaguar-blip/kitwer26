/**
 * Drizzle ORM schema for the audit system tables.
 * These tables live in the SAME Supabase database as the main app.
 *
 * Tables:
 *   audit_runs      — one row per full audit run (scan_id)
 *   audit_findings  — individual findings discovered by workers
 *   audit_fixes     — fixes generated and applied per finding
 *   audit_logs      — immutable trail: before/after state per fix
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ── audit_runs ────────────────────────────────────────────────────────────────

export const auditRuns = pgTable(
  'audit_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: text('scan_id').notNull().unique(),
    iteration: integer('iteration').notNull().default(1),
    status: text('status').notNull().default('running'),    // running | converged | escalated | failed
    riskLevel: text('risk_level'),                          // CRITICAL | HIGH | MEDIUM | LOW
    activeValidProducts: integer('active_valid_products').default(0),
    revenueLeaksFound: integer('revenue_leaks_found').default(0),
    affiliateTagMissing: integer('affiliate_tag_missing').default(0),
    marginErrors: integer('margin_errors').default(0),
    placeholderErrors: integer('placeholder_errors').default(0),
    potentialLostValueEur: numeric('potential_lost_value_eur', { precision: 12, scale: 2 }).default('0'),
    fixesApplied: integer('fixes_applied').default(0),
    converged: boolean('converged').default(false),
    nextStep: text('next_step'),                            // STOP_AND_FIX | PROCEED_TO_DEPLOY
    indexHitRate: text('index_hit_rate'),
    avgQueryTimeMs: integer('avg_query_time_ms').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    idxScanId: index('idx_audit_runs_scan_id').on(t.scanId),
    idxStatus: index('idx_audit_runs_status').on(t.status),
  })
);

// ── audit_findings ─────────────────────────────────────────────────────────────

export const auditFindings = pgTable(
  'audit_findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: text('scan_id').notNull(),
    runId: uuid('run_id').notNull(),
    workerName: text('worker_name').notNull(),              // scanner | affiliate | pricing | performance | fix
    findingType: text('finding_type').notNull(),            // revenue_leak | missing_tag | margin_error | placeholder | index_miss
    productId: text('product_id'),
    severity: text('severity').notNull().default('MEDIUM'), // CRITICAL | HIGH | MEDIUM | LOW
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    resolved: boolean('resolved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    idxScanId: index('idx_audit_findings_scan_id').on(t.scanId),
    idxResolved: index('idx_audit_findings_resolved').on(t.resolved),
  })
);

// ── audit_fixes ───────────────────────────────────────────────────────────────

export const auditFixes = pgTable(
  'audit_fixes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: text('scan_id').notNull(),
    findingId: uuid('finding_id').notNull(),
    fixSql: text('fix_sql').notNull(),
    isDryRun: boolean('is_dry_run').notNull().default(true),
    applied: boolean('applied').notNull().default(false),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    rowsAffected: integer('rows_affected').default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    idxScanId: index('idx_audit_fixes_scan_id').on(t.scanId),
    idxFindingId: index('idx_audit_fixes_finding_id').on(t.findingId),
  })
);

// ── audit_logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: text('job_id').notNull(),
    findingId: uuid('finding_id').notNull(),
    fixId: uuid('fix_id').notNull(),
    fixSql: text('fix_sql').notNull(),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    success: boolean('success').notNull().default(false),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    idxJobId: index('idx_audit_logs_job_id').on(t.jobId),
    idxFindingId: index('idx_audit_logs_finding_id').on(t.findingId),
  })
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditRun = typeof auditRuns.$inferSelect;
export type NewAuditRun = typeof auditRuns.$inferInsert;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type NewAuditFinding = typeof auditFindings.$inferInsert;
export type AuditFix = typeof auditFixes.$inferSelect;
export type NewAuditFix = typeof auditFixes.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
