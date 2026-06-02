const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function slugifyTitle(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug || "kelas";
}

export function extractIdFromSlugParam(param: string) {
  return param.match(uuidPattern)?.[0] ?? param;
}

export function classSlug({ id, title }: { id: string; title: string }) {
  return `${slugifyTitle(title)}-${id}`;
}

export function moduleSlug({ id, title }: { id: string; title: string }) {
  return `${slugifyTitle(title)}-${id}`;
}

export function getDosenClassPath(classItem: { id: string; title: string }) {
  return `/dosen/classes/${classSlug(classItem)}`;
}

export function getDosenClassMembersPath(classItem: { id: string; title: string }) {
  return `${getDosenClassPath(classItem)}/members`;
}

export function getDosenClassReportsPath(classItem: { id: string; title: string }) {
  return `${getDosenClassPath(classItem)}/reports`;
}

export function getDosenClassSettingsPath(classItem: { id: string; title: string }) {
  return `${getDosenClassPath(classItem)}/settings`;
}

export function getMahasiswaClassPath(classItem: { id: string; title: string }) {
  return `/mahasiswa/classes/${classSlug(classItem)}`;
}

export function getDosenModulePath(
  classItem: { id: string; title: string },
  moduleItem: { id: string; title: string },
) {
  return `${getDosenClassPath(classItem)}/modules/${moduleSlug(moduleItem)}`;
}

export function getDosenModuleAssignmentsPath(
  classItem: { id: string; title: string },
  moduleItem: { id: string; title: string },
) {
  return `${getDosenModulePath(classItem, moduleItem)}/assignments`;
}

export function getDosenModuleQuizzesPath(
  classItem: { id: string; title: string },
  moduleItem: { id: string; title: string },
) {
  return `${getDosenModulePath(classItem, moduleItem)}/quizzes`;
}
