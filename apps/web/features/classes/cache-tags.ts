import { updateTag } from "next/cache";

export const CLASS_CACHE_REVALIDATE_SECONDS = 60;

export function classDataTag(classId: string) {
  return `class:${classId}`;
}

export function dosenDashboardTag(lecturerId: string) {
  return `dosen-dashboard:${lecturerId}`;
}

export function mahasiswaClassTag(studentId: string, classId: string) {
  return `mahasiswa-class:${studentId}:${classId}`;
}

export const mahasiswaDashboardTag = "mahasiswa-dashboard";

export function invalidateClassDataCache(options: {
  classId?: string | null;
  lecturerId?: string | null;
  studentId?: string | null;
}) {
  if (options.classId) {
    updateTag(classDataTag(options.classId));
  }

  if (options.lecturerId) {
    updateTag(dosenDashboardTag(options.lecturerId));
  }

  if (options.studentId && options.classId) {
    updateTag(mahasiswaClassTag(options.studentId, options.classId));
  }

  updateTag(mahasiswaDashboardTag);
}
