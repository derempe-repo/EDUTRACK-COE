import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

import { classes, classMembers, modules, profiles } from "../db/schema";
import { getAdminUsersData, getAuditLogData, getMonitoringData } from "../features/admin/data";
import {
  getAdminDashboardData,
  getDosenClassDetail,
  getDosenDashboardData,
  getDosenModuleAssignmentsDetail,
  getDosenModuleDetail,
  getMahasiswaClassDetail,
  getMahasiswaDashboardData,
  getSuperAdminDashboardData,
} from "../features/classes/data";
import { db } from "../lib/db";

dotenv.config({ path: ".env.local" });

type AuditItem = {
  label: string;
  run: () => Promise<unknown>;
};

async function main() {
  const items: AuditItem[] = [
    { label: "admin.dashboard", run: () => getAdminDashboardData() },
    { label: "admin.monitoring", run: () => getMonitoringData() },
    { label: "admin.users", run: () => getAdminUsersData(undefined) },
    { label: "admin.auditLogs", run: () => getAuditLogData(undefined) },
    { label: "superAdmin.dashboard", run: () => getSuperAdminDashboardData() },
  ];

  const lecturerClassRows = await db
    .select({ classId: classes.id, lecturerId: profiles.id })
    .from(classes)
    .innerJoin(profiles, eq(profiles.id, classes.createdBy))
    .where(eq(profiles.role, "dosen"))
    .limit(1);
  const lecturerRows =
    lecturerClassRows.length > 0
      ? []
      : await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.role, "dosen"))
          .limit(1);
  const lecturerId = lecturerClassRows[0]?.lecturerId ?? lecturerRows[0]?.id;

  if (lecturerId) {
    items.push({ label: "dosen.dashboard", run: () => getDosenDashboardData(lecturerId) });

    const classId =
      lecturerClassRows[0]?.classId ??
      (
        await db
          .select({ id: classes.id })
          .from(classes)
          .where(eq(classes.createdBy, lecturerId))
          .limit(1)
      )[0]?.id;

    if (classId) {
      items.push({
        label: "dosen.classDetail",
        run: () => getDosenClassDetail(lecturerId, classId),
      });

      const moduleRows = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.classId, classId))
        .limit(1);
      const moduleId = moduleRows[0]?.id;

      if (moduleId) {
        items.push({
          label: "dosen.moduleDetail",
          run: () => getDosenModuleDetail(lecturerId, classId, moduleId),
        });
        items.push({
          label: "dosen.moduleAssignments",
          run: () => getDosenModuleAssignmentsDetail(lecturerId, classId, moduleId),
        });
      }
    }
  }

  const studentRows = await db
    .select({ classId: classMembers.classId, id: profiles.id })
    .from(profiles)
    .innerJoin(classMembers, eq(classMembers.profileId, profiles.id))
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(profiles.role, "mahasiswa"),
        eq(classMembers.role, "student"),
        eq(classes.status, "published"),
      ),
    )
    .limit(1);
  const student = studentRows[0];

  if (student) {
    items.push({ label: "mahasiswa.dashboard", run: () => getMahasiswaDashboardData(student.id) });
    items.push({
      label: "mahasiswa.classDetail",
      run: () => getMahasiswaClassDetail(student.id, student.classId),
    });
  }

  console.log("Performance audit started");
  for (const item of items) {
    const start = performance.now();
    try {
      await item.run();
      const duration = Math.round(performance.now() - start);
      console.log(`${item.label}: ${duration}ms`);
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      console.error(`${item.label}: failed after ${duration}ms`);
      console.error(error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
