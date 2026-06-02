import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

import {
  assignments,
  auditLogs,
  classes,
  examModeEvents,
  exports,
  notifications,
  plagiarismChecks,
  profiles,
  quizAttempts,
  submissions,
  systemSettings,
  modules,
  moduleSteps,
} from "@/db/schema";
import type { AppUserRole, AppUserStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminSearchParams = Record<string, string | string[] | undefined> | undefined;

export const defaultSystemSettings = {
  auditRetentionDays: 90,
  plagiarismThresholdPercent: 70,
  registrationsEnabled: true,
} as const;

export async function getAdminUsersData(searchParams: AdminSearchParams) {
  const query = getSingleParam(searchParams?.q)?.trim() ?? "";
  const role = parseRole(getSingleParam(searchParams?.role));
  const status = parseStatus(getSingleParam(searchParams?.status));
  const conditions = [];

  if (query) {
    conditions.push(or(ilike(profiles.name, `%${query}%`), ilike(profiles.email, `%${query}%`))!);
  }

  if (role) {
    conditions.push(eq(profiles.role, role));
  }

  if (status) {
    conditions.push(eq(profiles.status, status));
  }

  const users = await db
    .select({
      createdAt: profiles.createdAt,
      email: profiles.email,
      id: profiles.id,
      lastLoginAt: profiles.lastLoginAt,
      name: profiles.name,
      role: profiles.role,
      status: profiles.status,
    })
    .from(profiles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(profiles.createdAt))
    .limit(200);
  const roleCounts = await db
    .select({
      role: profiles.role,
      value: sql<number>`count(*)::int`,
    })
    .from(profiles)
    .groupBy(profiles.role);

  return {
    filters: { query, role, status },
    roleCounts: Object.fromEntries(roleCounts.map((item) => [item.role, Number(item.value)])),
    users,
  };
}

export async function getAuditLogData(searchParams: AdminSearchParams) {
  const query = getSingleParam(searchParams?.q)?.trim() ?? "";
  const role = parseRole(getSingleParam(searchParams?.role));
  const conditions = [];

  if (query) {
    conditions.push(
      or(
        ilike(auditLogs.action, `%${query}%`),
        ilike(auditLogs.entityType, `%${query}%`),
      )!,
    );
  }

  if (role) {
    conditions.push(eq(auditLogs.actorRole, role));
  }

  const logs = await db
    .select({
      action: auditLogs.action,
      actorId: auditLogs.actorId,
      actorName: profiles.name,
      actorRole: auditLogs.actorRole,
      createdAt: auditLogs.createdAt,
      entityId: auditLogs.entityId,
      entityType: auditLogs.entityType,
      id: auditLogs.id,
      ipAddress: auditLogs.ipAddress,
      metadata: auditLogs.metadata,
      userAgent: auditLogs.userAgent,
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(profiles.id, auditLogs.actorId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(150);

  return {
    filters: { query, role },
    logs,
  };
}

export async function getSystemSettingsData() {
  const settings = await db
    .select({
      description: systemSettings.description,
      key: systemSettings.key,
      updatedAt: systemSettings.updatedAt,
      value: systemSettings.value,
    })
    .from(systemSettings);
  const byKey = new Map(settings.map((setting) => [setting.key, setting]));

  return {
    auditRetentionDays: readNumberSetting(
      byKey.get("audit_retention_days")?.value,
      defaultSystemSettings.auditRetentionDays,
    ),
    plagiarismThresholdPercent: readNumberSetting(
      byKey.get("plagiarism_threshold_percent")?.value,
      defaultSystemSettings.plagiarismThresholdPercent,
    ),
    registrationsEnabled: readBooleanSetting(
      byKey.get("registrations_enabled")?.value,
      defaultSystemSettings.registrationsEnabled,
    ),
    rows: settings,
  };
}

export async function getMonitoringData() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    auditCount,
    classStatusRows,
    failedExports,
    flaggedReviews,
    flaggedSubmissions,
    recentAuditLogs,
    roleRows,
    startedQuizAttempts,
    unreadNotifications,
    warningEvents,
  ] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, since)),
    db
      .select({ status: classes.status, value: sql<number>`count(*)::int` })
      .from(classes)
      .groupBy(classes.status),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(exports)
      .where(eq(exports.status, "failed")),
    db
      .select({
        assignmentTitle: assignments.title,
        checkedAt: plagiarismChecks.checkedAt,
        classTitle: classes.title,
        fileName: submissions.fileName,
        similarityScore: plagiarismChecks.similarityScore,
        studentEmail: profiles.email,
        studentName: profiles.name,
        submissionId: submissions.id,
        thresholdPercent: plagiarismChecks.thresholdPercent,
      })
      .from(plagiarismChecks)
      .innerJoin(submissions, eq(submissions.id, plagiarismChecks.submissionId))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .innerJoin(classes, eq(classes.id, modules.classId))
      .innerJoin(profiles, eq(profiles.id, submissions.studentId))
      .where(eq(plagiarismChecks.status, "flagged"))
      .orderBy(desc(plagiarismChecks.checkedAt))
      .limit(20),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(submissions)
      .where(eq(submissions.plagiarismStatus, "flagged")),
    db
      .select({
        action: auditLogs.action,
        actorRole: auditLogs.actorRole,
        createdAt: auditLogs.createdAt,
        id: auditLogs.id,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
    db
      .select({ role: profiles.role, value: sql<number>`count(*)::int` })
      .from(profiles)
      .groupBy(profiles.role),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(quizAttempts)
      .where(eq(quizAttempts.status, "started")),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.status, "unread")),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(examModeEvents)
      .where(gte(examModeEvents.createdAt, since)),
  ]);

  return {
    classStatuses: Object.fromEntries(classStatusRows.map((item) => [item.status, Number(item.value)])),
    flaggedReviews,
    recentAuditLogs,
    roles: Object.fromEntries(roleRows.map((item) => [item.role, Number(item.value)])),
    stats: {
      auditEvents24Hours: Number(auditCount[0]?.value ?? 0),
      failedExports: Number(failedExports[0]?.value ?? 0),
      flaggedSubmissions: Number(flaggedSubmissions[0]?.value ?? 0),
      startedQuizAttempts: Number(startedQuizAttempts[0]?.value ?? 0),
      unreadNotifications: Number(unreadNotifications[0]?.value ?? 0),
      warningEvents24Hours: Number(warningEvents[0]?.value ?? 0),
    },
  };
}

export async function getRegistrationsEnabled() {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "registrations_enabled"))
    .limit(1);

  return readBooleanSetting(rows[0]?.value, defaultSystemSettings.registrationsEnabled);
}

function parseRole(value: string | undefined): AppUserRole | null {
  return value === "mahasiswa" || value === "dosen" || value === "admin" || value === "super_admin"
    ? value
    : null;
}

function parseStatus(value: string | undefined): AppUserStatus | null {
  return value === "active" || value === "inactive" ? value : null;
}

function readBooleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumberSetting(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
