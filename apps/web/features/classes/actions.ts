"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  classes,
  classMembers,
  materialReads,
  materials,
  modules,
  moduleSteps,
  profiles,
} from "@/db/schema";
import {
  buildMaterialStoragePath,
  MATERIALS_BUCKET,
  validateMaterialFile,
} from "@/features/classes/material-storage";
import {
  getDosenClassMembersPath,
  getDosenClassPath,
  getDosenClassSettingsPath,
  getDosenModulePath,
  getMahasiswaClassPath,
} from "@/features/classes/urls";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "@/lib/validators";
import { tryIssueEligibleCertificate } from "@/features/certificates/issuer";
import { hasPriorFlaggedSubmission } from "@/features/plagiarism/access";
import { gradeWeightsTotal } from "@/features/grades/class-score";

const classStatusSchema = z.enum(["draft", "published", "archived"]);
const materialTypeSchema = z.enum(["pdf", "video", "slide", "link"]);

const textField = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const sortOrderField = z.coerce.number().int().min(0).max(999);

async function requireOwnedClass(classId: string, lecturerId: string) {
  const rows = await db
    .select({ id: classes.id, title: classes.title })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=class_not_found");
  }

  return rows[0];
}

async function requireOwnedModule(moduleId: string, lecturerId: string) {
  const rows = await db
    .select({
      id: modules.id,
      title: modules.title,
      classId: modules.classId,
      classTitle: classes.title,
    })
    .from(modules)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(modules.id, moduleId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=module_not_found");
  }

  return rows[0];
}

async function requireOwnedStep(stepId: string, lecturerId: string) {
  const rows = await db
    .select({
      id: moduleSteps.id,
      moduleId: modules.id,
      moduleTitle: modules.title,
      classId: modules.classId,
      classTitle: classes.title,
    })
    .from(moduleSteps)
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(moduleSteps.id, stepId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=step_not_found");
  }

  return rows[0];
}

async function requireOwnedMaterial(materialId: string, lecturerId: string) {
  const rows = await db
    .select({
      id: materials.id,
      stepId: materials.moduleStepId,
      moduleId: modules.id,
      moduleTitle: modules.title,
      classId: modules.classId,
      classTitle: classes.title,
      storagePath: materials.storagePath,
    })
    .from(materials)
    .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(materials.id, materialId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=material_not_found");
  }

  return rows[0];
}

async function requireStudentMaterial(materialId: string, studentId: string) {
  const rows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      materialId: materials.id,
      moduleId: modules.id,
      moduleIsLocked: modules.isLocked,
      stepId: moduleSteps.id,
      status: classes.status,
    })
    .from(materials)
    .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(materials.id, materialId),
        eq(classMembers.profileId, studentId),
        eq(classMembers.role, "student"),
      ),
    )
    .limit(1);

  const material = rows[0] ?? null;

  if (!material || material.status !== "published" || material.moduleIsLocked) {
    redirect("/mahasiswa/dashboard?error=material_not_found");
  }

  if (
    await hasPriorFlaggedSubmission({
      classId: material.classId,
      moduleId: material.moduleId,
      studentId,
    })
  ) {
    redirect(
      getMahasiswaClassPath({ id: material.classId, title: material.classTitle }) +
        "?error=plagiarism_module_locked",
    );
  }

  return material;
}

export async function createClassAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(120),
      description: textField,
      status: classStatusSchema,
    })
    .safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      status: formData.get("status"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_class");
  }

  const [classItem] = await db
    .insert(classes)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      createdBy: profile.id,
      publishedAt: parsed.data.status === "published" ? new Date() : null,
    })
    .returning({ id: classes.id });

  await db.insert(classMembers).values({
    classId: classItem.id,
    profileId: profile.id,
    role: "lecturer",
  });

  await writeAuditLog({
    action: "classes.created",
    entityType: "classes",
    entityId: classItem.id,
    metadata: {
      title: parsed.data.title,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dosen/dashboard");
  redirect(getDosenClassPath({ id: classItem.id, title: parsed.data.title }));
}

export async function updateClassAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      description: textField,
      status: classStatusSchema,
      assignmentWeight: z.coerce.number().int().min(0).max(100),
      quizWeight: z.coerce.number().int().min(0).max(100),
      finalExamWeight: z.coerce.number().int().min(0).max(100),
    })
    .refine((value) => gradeWeightsTotal(value) === 100)
    .safeParse({
      classId: formData.get("classId"),
      title: formData.get("title"),
      description: formData.get("description"),
      status: formData.get("status"),
      assignmentWeight: formData.get("assignmentWeight"),
      quizWeight: formData.get("quizWeight"),
      finalExamWeight: formData.get("finalExamWeight"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_class");
  }

  const classItem = await requireOwnedClass(parsed.data.classId, profile.id);

  await db
    .update(classes)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      assignmentWeight: parsed.data.assignmentWeight,
      quizWeight: parsed.data.quizWeight,
      finalExamWeight: parsed.data.finalExamWeight,
      publishedAt: parsed.data.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(classes.id, parsed.data.classId));

  await writeAuditLog({
    action: "classes.updated",
    entityType: "classes",
    entityId: parsed.data.classId,
    metadata: {
      grade_weights: {
        assignment: parsed.data.assignmentWeight,
        final_exam: parsed.data.finalExamWeight,
        quiz: parsed.data.quizWeight,
      },
      title: parsed.data.title,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dosen/dashboard");
  revalidatePath(`/dosen/classes/${parsed.data.classId}`);
  redirect(getDosenClassSettingsPath({ id: classItem.id, title: parsed.data.title }) + "?saved=1");
}

export async function deleteClassAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ classId: z.uuid() }).safeParse({
    classId: formData.get("classId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_class");
  }

  const classItem = await requireOwnedClass(parsed.data.classId, profile.id);

  try {
    await db.delete(classes).where(eq(classes.id, parsed.data.classId));
  } catch {
    redirect(getDosenClassSettingsPath(classItem) + "?error=class_delete_failed");
  }

  await writeAuditLog({
    action: "classes.deleted",
    entityType: "classes",
    entityId: parsed.data.classId,
  });

  revalidatePath("/dosen/dashboard");
  redirect("/dosen/dashboard?deleted=1");
}

export async function createModuleAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      description: textField,
      sortOrder: sortOrderField,
      isLocked: z.boolean(),
    })
    .safeParse({
      classId: formData.get("classId"),
      title: formData.get("title"),
      description: formData.get("description"),
      sortOrder: formData.get("sortOrder") ?? 0,
      isLocked: formData.get("isLocked") === "on",
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_module");
  }

  const classItem = await requireOwnedClass(parsed.data.classId, profile.id);

  const [moduleItem] = await db
    .insert(modules)
    .values({
      classId: parsed.data.classId,
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      isLocked: parsed.data.isLocked,
    })
    .returning({ id: modules.id });

  await writeAuditLog({
    action: "modules.created",
    entityType: "modules",
    entityId: moduleItem.id,
    metadata: {
      class_id: parsed.data.classId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${parsed.data.classId}`);
  redirect(
    getDosenModulePath(classItem, { id: moduleItem.id, title: parsed.data.title }) + "?module_created=1",
  );
}

export async function deleteModuleAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ moduleId: z.uuid() }).safeParse({
    moduleId: formData.get("moduleId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_module");
  }

  const moduleItem = await requireOwnedModule(parsed.data.moduleId, profile.id);
  await db.delete(modules).where(eq(modules.id, parsed.data.moduleId));

  await writeAuditLog({
    action: "modules.deleted",
    entityType: "modules",
    entityId: parsed.data.moduleId,
    metadata: {
      class_id: moduleItem.classId,
    },
  });

  revalidatePath(`/dosen/classes/${moduleItem.classId}`);
  redirect(
    getDosenClassPath({ id: moduleItem.classId, title: moduleItem.classTitle }) +
      "?module_deleted=1",
  );
}

export async function updateModuleAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      moduleId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      description: textField,
      sortOrder: sortOrderField,
      isLocked: z.boolean(),
    })
    .safeParse({
      moduleId: formData.get("moduleId"),
      title: formData.get("title"),
      description: formData.get("description"),
      sortOrder: formData.get("sortOrder") ?? 0,
      isLocked: formData.get("isLocked") === "on",
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_module");
  }

  const moduleItem = await requireOwnedModule(parsed.data.moduleId, profile.id);

  await db
    .update(modules)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      isLocked: parsed.data.isLocked,
      updatedAt: new Date(),
    })
    .where(eq(modules.id, parsed.data.moduleId));

  await writeAuditLog({
    action: "modules.updated",
    entityType: "modules",
    entityId: parsed.data.moduleId,
    metadata: {
      class_id: moduleItem.classId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${moduleItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: moduleItem.classId, title: moduleItem.classTitle },
      { id: parsed.data.moduleId, title: parsed.data.title },
    ) + "?module_updated=1",
  );
}

export async function createStepAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      moduleId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      description: textField,
      sortOrder: sortOrderField,
      isRequired: z.boolean(),
    })
    .safeParse({
      moduleId: formData.get("moduleId"),
      title: formData.get("title"),
      description: formData.get("description"),
      sortOrder: formData.get("sortOrder") ?? 0,
      isRequired: formData.get("isRequired") === "on",
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_step");
  }

  const moduleItem = await requireOwnedModule(parsed.data.moduleId, profile.id);
  const [stepItem] = await db
    .insert(moduleSteps)
    .values({
      moduleId: parsed.data.moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      isRequired: parsed.data.isRequired,
    })
    .returning({ id: moduleSteps.id });

  await writeAuditLog({
    action: "module_steps.created",
    entityType: "module_steps",
    entityId: stepItem.id,
    metadata: {
      class_id: moduleItem.classId,
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${moduleItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: moduleItem.classId, title: moduleItem.classTitle },
      { id: moduleItem.id, title: moduleItem.title },
    ) + "?step_created=1",
  );
}

export async function deleteStepAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ stepId: z.uuid() }).safeParse({
    stepId: formData.get("stepId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_step");
  }

  const stepItem = await requireOwnedStep(parsed.data.stepId, profile.id);
  await db.delete(moduleSteps).where(eq(moduleSteps.id, parsed.data.stepId));

  await writeAuditLog({
    action: "module_steps.deleted",
    entityType: "module_steps",
    entityId: parsed.data.stepId,
    metadata: {
      class_id: stepItem.classId,
    },
  });

  revalidatePath(`/dosen/classes/${stepItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: stepItem.classId, title: stepItem.classTitle },
      { id: stepItem.moduleId, title: stepItem.moduleTitle },
    ) + "?step_deleted=1",
  );
}

export async function updateStepAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      stepId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      description: textField,
      sortOrder: sortOrderField,
      isRequired: z.boolean(),
    })
    .safeParse({
      stepId: formData.get("stepId"),
      title: formData.get("title"),
      description: formData.get("description"),
      sortOrder: formData.get("sortOrder") ?? 0,
      isRequired: formData.get("isRequired") === "on",
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_step");
  }

  const stepItem = await requireOwnedStep(parsed.data.stepId, profile.id);

  await db
    .update(moduleSteps)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      isRequired: parsed.data.isRequired,
      updatedAt: new Date(),
    })
    .where(eq(moduleSteps.id, parsed.data.stepId));

  await writeAuditLog({
    action: "module_steps.updated",
    entityType: "module_steps",
    entityId: parsed.data.stepId,
    metadata: {
      class_id: stepItem.classId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${stepItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: stepItem.classId, title: stepItem.classTitle },
      { id: stepItem.moduleId, title: stepItem.moduleTitle },
    ) + "?step_updated=1",
  );
}

export async function createMaterialAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const rawUrl = String(formData.get("url") ?? "").trim();
  const url = rawUrl.length > 0 ? rawUrl : null;
  const parsed = z
    .object({
      stepId: z.uuid(),
      title: z.string().trim().min(3).max(120),
      type: materialTypeSchema,
      description: textField,
      sortOrder: sortOrderField,
    })
    .safeParse({
      stepId: formData.get("stepId"),
      title: formData.get("title"),
      type: formData.get("type"),
      description: formData.get("description"),
      sortOrder: formData.get("sortOrder") ?? 0,
    });

  if (!parsed.success || (!url && !file)) {
    redirect("/dosen/dashboard?error=invalid_material");
  }

  if ((parsed.data.type === "link" || parsed.data.type === "video") && !url) {
    redirect("/dosen/dashboard?error=invalid_material_url");
  }

  if (url) {
    try {
      new URL(url);
    } catch {
      redirect("/dosen/dashboard?error=invalid_material_url");
    }
  }

  if (file && (parsed.data.type === "link" || parsed.data.type === "video")) {
    redirect("/dosen/dashboard?error=invalid_material_file");
  }

  if (file && (parsed.data.type === "pdf" || parsed.data.type === "slide")) {
    const fileError = validateMaterialFile({ file, type: parsed.data.type });

    if (fileError) {
      redirect("/dosen/dashboard?error=invalid_material_file");
    }
  }

  const stepItem = await requireOwnedStep(parsed.data.stepId, profile.id);
  let storagePath: string | null = null;

  if (file && (parsed.data.type === "pdf" || parsed.data.type === "slide")) {
    storagePath = buildMaterialStoragePath({
      classId: stepItem.classId,
      moduleId: stepItem.moduleId,
      fileName: file.name,
      token: crypto.randomUUID(),
    });

    const supabase = await createClient();
    const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      redirect(
        getDosenModulePath(
          { id: stepItem.classId, title: stepItem.classTitle },
          { id: stepItem.moduleId, title: stepItem.moduleTitle },
        ) + "?error=material_upload_failed",
      );
    }
  }

  const [materialItem] = await db
    .insert(materials)
    .values({
      moduleStepId: parsed.data.stepId,
      title: parsed.data.title,
      type: parsed.data.type,
      url,
      storagePath,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      createdBy: profile.id,
    })
    .returning({ id: materials.id });

  await writeAuditLog({
    action: "materials.created",
    entityType: "materials",
    entityId: materialItem.id,
    metadata: {
      class_id: stepItem.classId,
      step_id: parsed.data.stepId,
      type: parsed.data.type,
      storage_path: storagePath,
    },
  });

  revalidatePath(`/dosen/classes/${stepItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: stepItem.classId, title: stepItem.classTitle },
      { id: stepItem.moduleId, title: stepItem.moduleTitle },
    ) + "?material_created=1",
  );
}

export async function deleteMaterialAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      materialId: z.uuid(),
    })
    .safeParse({
      materialId: formData.get("materialId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_material");
  }

  const materialItem = await requireOwnedMaterial(parsed.data.materialId, profile.id);

  if (materialItem.storagePath) {
    const supabase = await createClient();
    await supabase.storage.from(MATERIALS_BUCKET).remove([materialItem.storagePath]);
  }

  await db.delete(materials).where(eq(materials.id, parsed.data.materialId));

  await writeAuditLog({
    action: "materials.deleted",
    entityType: "materials",
    entityId: parsed.data.materialId,
    metadata: {
      class_id: materialItem.classId,
      step_id: materialItem.stepId,
    },
  });

  revalidatePath(`/dosen/classes/${materialItem.classId}`);
  redirect(
    getDosenModulePath(
      { id: materialItem.classId, title: materialItem.classTitle },
      { id: materialItem.moduleId, title: materialItem.moduleTitle },
    ) + "?material_deleted=1",
  );
}

export async function markMaterialReadAction(formData: FormData) {
  const profile = await requireRole(["mahasiswa"]);
  const parsed = z.object({ materialId: z.uuid() }).safeParse({
    materialId: formData.get("materialId"),
  });

  if (!parsed.success) {
    redirect("/mahasiswa/dashboard?error=invalid_material_read");
  }

  const material = await requireStudentMaterial(parsed.data.materialId, profile.id);
  const now = new Date();

  await db
    .insert(materialReads)
    .values({
      materialId: parsed.data.materialId,
      readAt: now,
      studentId: profile.id,
    })
    .onConflictDoUpdate({
      target: [materialReads.materialId, materialReads.studentId],
      set: {
        readAt: now,
        updatedAt: now,
      },
    });

  await writeAuditLog({
    action: "material_reads.marked",
    entityId: parsed.data.materialId,
    entityType: "materials",
    metadata: {
      class_id: material.classId,
      step_id: material.stepId,
    },
  });

  await tryIssueEligibleCertificate(profile.id, material.classId);

  revalidatePath(`/mahasiswa/classes/${material.classId}`);
  revalidatePath("/mahasiswa/dashboard");
  redirect(getMahasiswaClassPath({ id: material.classId, title: material.classTitle }) + "?material_read=1");
}

export async function enrollStudentAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      email: z.email(),
    })
    .safeParse({
      classId: formData.get("classId"),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_enrollment");
  }

  const classItem = await requireOwnedClass(parsed.data.classId, profile.id);

  const studentRows = await db
    .select({ id: profiles.id, email: profiles.email, role: profiles.role, status: profiles.status })
    .from(profiles)
    .where(eq(profiles.email, parsed.data.email))
    .limit(1);

  const student = studentRows[0];

  if (!student || student.role !== "mahasiswa" || student.status !== "active") {
    redirect(getDosenClassMembersPath(classItem) + "?error=student_not_found");
  }

  await db
    .insert(classMembers)
    .values({
      classId: parsed.data.classId,
      profileId: student.id,
      role: "student",
    })
    .onConflictDoUpdate({
      target: [classMembers.classId, classMembers.profileId],
      set: {
        role: "student",
        updatedAt: new Date(),
      },
    });

  await writeAuditLog({
    action: "class_members.enrolled",
    entityType: "class_members",
    entityId: student.id,
    metadata: {
      class_id: parsed.data.classId,
      student_email: student.email,
    },
  });

  revalidatePath(`/dosen/classes/${parsed.data.classId}`);
  revalidatePath("/dosen/dashboard");
  revalidatePath("/mahasiswa/dashboard");
  redirect(getDosenClassMembersPath(classItem) + "?student_enrolled=1");
}

export async function removeClassMemberAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      memberId: z.uuid(),
    })
    .safeParse({
      classId: formData.get("classId"),
      memberId: formData.get("memberId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_enrollment");
  }

  const classItem = await requireOwnedClass(parsed.data.classId, profile.id);

  const memberRows = await db
    .select({
      id: classMembers.id,
      profileId: classMembers.profileId,
      role: classMembers.role,
    })
    .from(classMembers)
    .where(and(eq(classMembers.id, parsed.data.memberId), eq(classMembers.classId, parsed.data.classId)))
    .limit(1);

  const member = memberRows[0];

  if (!member || member.role === "lecturer") {
    redirect(getDosenClassMembersPath(classItem) + "?error=member_not_found");
  }

  await db.delete(classMembers).where(eq(classMembers.id, parsed.data.memberId));

  await writeAuditLog({
    action: "class_members.removed",
    entityType: "class_members",
    entityId: member.profileId,
    metadata: {
      class_id: parsed.data.classId,
      member_role: member.role,
    },
  });

  revalidatePath(`/dosen/classes/${parsed.data.classId}`);
  revalidatePath("/dosen/dashboard");
  revalidatePath("/mahasiswa/dashboard");
  redirect(getDosenClassMembersPath(classItem) + "?member_removed=1");
}
