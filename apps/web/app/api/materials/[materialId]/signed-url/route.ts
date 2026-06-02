import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { classes, classMembers, materials, modules, moduleSteps } from "@/db/schema";
import { canAccessMaterial } from "@/features/classes/access";
import {
  buildMaterialDownloadFileName,
  MATERIALS_BUCKET,
} from "@/features/classes/material-storage";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type SignedUrlRouteContext = {
  params: Promise<{
    materialId: string;
  }>;
};

export async function GET(_request: Request, context: SignedUrlRouteContext) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { materialId } = await context.params;
  const materialRows = await db
    .select({
      id: materials.id,
      title: materials.title,
      url: materials.url,
      storagePath: materials.storagePath,
      classId: classes.id,
      classOwnerId: classes.createdBy,
      classStatus: classes.status,
      moduleIsLocked: modules.isLocked,
    })
    .from(materials)
    .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(eq(materials.id, materialId))
    .limit(1);

  const material = materialRows[0];

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasGlobalAccess = profile.role === "admin" || profile.role === "super_admin";
  const isClassOwner = material.classOwnerId === profile.id;
  let isClassMember = false;

  if (!hasGlobalAccess && !isClassOwner) {
    const memberRows = await db
      .select({ id: classMembers.id })
      .from(classMembers)
      .where(and(eq(classMembers.classId, material.classId), eq(classMembers.profileId, profile.id)))
      .limit(1);

    isClassMember = Boolean(memberRows[0]);
  }

  const canAccess = canAccessMaterial({
    classStatus: material.classStatus,
    isClassMember,
    isClassOwner,
    moduleIsLocked: material.moduleIsLocked,
    profileRole: profile.role,
  });

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!material.storagePath) {
    if (!material.url) {
      return NextResponse.json({ error: "Material has no file or URL" }, { status: 404 });
    }

    return NextResponse.redirect(material.url);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(material.storagePath, 300, {
      download: buildMaterialDownloadFileName({
        storagePath: material.storagePath,
        title: material.title,
      }),
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
