"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { profiles, systemSettings } from "@/db/schema";
import { canManageProfile } from "@/features/admin/permissions";
import { getAdminBasePath } from "@/features/admin/urls";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

export async function updateManagedProfileAction(formData: FormData) {
  const actor = await requireRole(["admin", "super_admin"]);
  const basePath = getAdminBasePath(actor.role);
  const parsed = z
    .object({
      profileId: z.uuid(),
      role: z.enum(["mahasiswa", "dosen", "admin", "super_admin"]),
      status: z.enum(["active", "inactive"]),
    })
    .safeParse({
      profileId: formData.get("profileId"),
      role: formData.get("role"),
      status: formData.get("status"),
    });

  if (!parsed.success) {
    redirect(`${basePath}/users?error=invalid_profile_update`);
  }

  const targetRows = await db
    .select({ id: profiles.id, role: profiles.role, status: profiles.status })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.profileId))
    .limit(1);
  const target = targetRows[0] ?? null;

  if (!target) {
    redirect(`${basePath}/users?error=profile_not_found`);
  }

  if (
    !canManageProfile({
      actorId: actor.id,
      actorRole: actor.role,
      nextRole: parsed.data.role,
      nextStatus: parsed.data.status,
      targetId: target.id,
      targetRole: target.role,
    })
  ) {
    redirect(`${basePath}/users?error=profile_update_forbidden`);
  }

  await db
    .update(profiles)
    .set({
      role: parsed.data.role,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, target.id));

  await writeAuditLog({
    action: "profiles.updated_by_admin",
    entityId: target.id,
    entityType: "profiles",
    metadata: {
      next_role: parsed.data.role,
      next_status: parsed.data.status,
      previous_role: target.role,
      previous_status: target.status,
    },
  });

  revalidatePath(`${basePath}/users`);
  redirect(`${basePath}/users?profile_updated=1`);
}

export async function updateSystemSettingsAction(formData: FormData) {
  const actor = await requireRole(["super_admin"]);
  const basePath = getAdminBasePath(actor.role);
  const parsed = z
    .object({
      auditRetentionDays: z.coerce.number().int().min(7).max(365),
      plagiarismThresholdPercent: z.coerce.number().int().min(0).max(100),
      registrationsEnabled: z.boolean(),
    })
    .safeParse({
      auditRetentionDays: formData.get("auditRetentionDays"),
      plagiarismThresholdPercent: formData.get("plagiarismThresholdPercent"),
      registrationsEnabled: formData.get("registrationsEnabled") === "on",
    });

  if (!parsed.success) {
    redirect(`${basePath}/settings?error=invalid_settings`);
  }

  const now = new Date();
  const settings = [
    {
      description: "Mengizinkan pendaftaran akun mahasiswa baru dari halaman registrasi.",
      key: "registrations_enabled",
      value: parsed.data.registrationsEnabled,
    },
    {
      description: "Ambang similarity untuk menandai submission saat plagiarism checker diaktifkan.",
      key: "plagiarism_threshold_percent",
      value: parsed.data.plagiarismThresholdPercent,
    },
    {
      description: "Target retensi audit log dalam hari untuk kebijakan operasional.",
      key: "audit_retention_days",
      value: parsed.data.auditRetentionDays,
    },
  ];

  await db.transaction(async (tx) => {
    for (const setting of settings) {
      await tx
        .insert(systemSettings)
        .values({
          ...setting,
          updatedBy: actor.id,
        })
        .onConflictDoUpdate({
          set: {
            description: setting.description,
            updatedAt: now,
            updatedBy: actor.id,
            value: setting.value,
          },
          target: systemSettings.key,
        });
    }
  });

  await writeAuditLog({
    action: "system_settings.updated",
    entityType: "system_settings",
    metadata: parsed.data,
  });

  revalidatePath(`${basePath}/settings`);
  redirect(`${basePath}/settings?settings_updated=1`);
}
