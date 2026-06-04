import { and, eq, lt, sql } from "drizzle-orm";

import { auditLogs, exports, quizAttempts, systemSettings } from "../../db/schema";
import { db } from "../../lib/db";
import { readPositiveIntegerSetting } from "./maintenance-auth";

const DEFAULT_AUDIT_RETENTION_DAYS = 90;
const DEFAULT_STALE_EXPORT_MINUTES = 30;

export type LightMaintenanceResult = {
  auditLogsDeleted: number;
  dryRun: boolean;
  expiredQuizAttempts: number;
  staleExportsFailed: number;
};

export async function runLightMaintenanceJob({
  dryRun = false,
  now = new Date(),
}: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<LightMaintenanceResult> {
  const auditRetentionDays = await getAuditRetentionDays();
  const staleExportCutoff = new Date(now.getTime() - DEFAULT_STALE_EXPORT_MINUTES * 60 * 1000);
  const auditRetentionCutoff = new Date(now.getTime() - auditRetentionDays * 24 * 60 * 60 * 1000);

  const [expiredQuizAttempts, staleExportsFailed, auditLogsDeleted] = dryRun
    ? await Promise.all([
        countExpiredQuizAttempts(now),
        countStaleProcessingExports(staleExportCutoff),
        countOldAuditLogs(auditRetentionCutoff),
      ])
    : await Promise.all([
        expireQuizAttempts(now),
        failStaleProcessingExports(staleExportCutoff, now),
        deleteOldAuditLogs(auditRetentionCutoff),
      ]);

  const result = {
    auditLogsDeleted,
    dryRun,
    expiredQuizAttempts,
    staleExportsFailed,
  };

  if (!dryRun) {
    await db.insert(auditLogs).values({
      action: "jobs.maintenance.ran",
      actorRole: "system",
      entityType: "maintenance",
      metadata: result,
    });
  }

  return result;
}

async function getAuditRetentionDays() {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "audit_retention_days"))
    .limit(1);

  return readPositiveIntegerSetting(rows[0]?.value, DEFAULT_AUDIT_RETENTION_DAYS);
}

async function countExpiredQuizAttempts(now: Date) {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.status, "started"), lt(quizAttempts.expiresAt, now)));

  return Number(rows[0]?.value ?? 0);
}

async function expireQuizAttempts(now: Date) {
  const rows = await db
    .update(quizAttempts)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(quizAttempts.status, "started"), lt(quizAttempts.expiresAt, now)))
    .returning({ id: quizAttempts.id });

  return rows.length;
}

async function countStaleProcessingExports(cutoff: Date) {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(exports)
    .where(and(eq(exports.status, "processing"), lt(exports.updatedAt, cutoff)));

  return Number(rows[0]?.value ?? 0);
}

async function failStaleProcessingExports(cutoff: Date, now: Date) {
  const rows = await db
    .update(exports)
    .set({
      errorMessage: "Export otomatis ditandai gagal karena melebihi batas waktu proses.",
      status: "failed",
      updatedAt: now,
    })
    .where(and(eq(exports.status, "processing"), lt(exports.updatedAt, cutoff)))
    .returning({ id: exports.id });

  return rows.length;
}

async function countOldAuditLogs(cutoff: Date) {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff));

  return Number(rows[0]?.value ?? 0);
}

async function deleteOldAuditLogs(cutoff: Date) {
  const rows = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .returning({ id: auditLogs.id });

  return rows.length;
}
