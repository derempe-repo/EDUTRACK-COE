import { unstable_cache } from "next/cache";

import {
  getAdminDashboardData,
  getDosenAssignmentSubmissionsDetail,
  getDosenClassDetail,
  getDosenDashboardData,
  getDosenModuleAssignmentsDetail,
  getDosenModuleDetail,
  getDosenModuleLearningDetail,
  getDosenQuizAttemptsDetail,
  getMahasiswaClassDetail,
  getMahasiswaDashboardData,
  getSuperAdminDashboardData,
} from "@/features/classes/data";
import {
  CLASS_CACHE_REVALIDATE_SECONDS,
  classDataTag,
  dosenDashboardTag,
  mahasiswaClassTag,
  mahasiswaDashboardTag,
} from "@/features/classes/cache-tags";

const adminDashboardTag = "admin-dashboard";
const superAdminDashboardTag = "super-admin-dashboard";

export function getCachedAdminDashboardData() {
  return unstable_cache(() => getAdminDashboardData(), ["admin-dashboard"], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [adminDashboardTag],
  })();
}

export function getCachedSuperAdminDashboardData() {
  return unstable_cache(() => getSuperAdminDashboardData(), ["super-admin-dashboard"], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [adminDashboardTag, superAdminDashboardTag],
  })();
}

export function getCachedDosenDashboardData(lecturerId: string) {
  return unstable_cache(() => getDosenDashboardData(lecturerId), ["dosen-dashboard", lecturerId], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [dosenDashboardTag(lecturerId)],
  })();
}

export function getCachedDosenClassDetail(lecturerId: string, classId: string) {
  return unstable_cache(() => getDosenClassDetail(lecturerId, classId), ["dosen-class-detail", lecturerId, classId], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
  })();
}

export function getCachedDosenModuleLearningDetail(lecturerId: string, classId: string, moduleId: string) {
  return unstable_cache(
    () => getDosenModuleLearningDetail(lecturerId, classId, moduleId),
    ["dosen-module-learning-detail", lecturerId, classId, moduleId],
    {
      revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
      tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
    },
  )();
}

export function getCachedDosenModuleAssignmentsDetail(lecturerId: string, classId: string, moduleId: string) {
  return unstable_cache(
    () => getDosenModuleAssignmentsDetail(lecturerId, classId, moduleId),
    ["dosen-module-assignments-detail", lecturerId, classId, moduleId],
    {
      revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
      tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
    },
  )();
}

export function getCachedDosenAssignmentSubmissionsDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
  assignmentId: string,
  options?: { page?: number },
) {
  const page = options?.page && options.page > 0 ? options.page : 1;

  return unstable_cache(
    () => getDosenAssignmentSubmissionsDetail(lecturerId, classId, moduleId, assignmentId, { page }),
    ["dosen-assignment-submissions-detail", lecturerId, classId, moduleId, assignmentId, String(page)],
    {
      revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
      tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
    },
  )();
}

export function getCachedDosenModuleDetail(lecturerId: string, classId: string, moduleId: string) {
  return unstable_cache(() => getDosenModuleDetail(lecturerId, classId, moduleId), [
    "dosen-module-detail",
    lecturerId,
    classId,
    moduleId,
  ], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
  })();
}

export function getCachedDosenQuizAttemptsDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
  quizId: string,
  options?: { page?: number },
) {
  const page = options?.page && options.page > 0 ? options.page : 1;

  return unstable_cache(
    () => getDosenQuizAttemptsDetail(lecturerId, classId, moduleId, quizId, { page }),
    ["dosen-quiz-attempts-detail", lecturerId, classId, moduleId, quizId, String(page)],
    {
      revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
      tags: [classDataTag(classId), dosenDashboardTag(lecturerId)],
    },
  )();
}

export function getCachedMahasiswaDashboardData(studentId: string) {
  return unstable_cache(() => getMahasiswaDashboardData(studentId), ["mahasiswa-dashboard", studentId], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [mahasiswaDashboardTag],
  })();
}

export function getCachedMahasiswaClassDetail(studentId: string, classId: string) {
  return unstable_cache(() => getMahasiswaClassDetail(studentId, classId), ["mahasiswa-class-detail", studentId, classId], {
    revalidate: CLASS_CACHE_REVALIDATE_SECONDS,
    tags: [classDataTag(classId), mahasiswaClassTag(studentId, classId), mahasiswaDashboardTag],
  })();
}
