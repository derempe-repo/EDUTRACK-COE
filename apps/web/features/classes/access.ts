type ClassStatus = "archived" | "draft" | "published";
type ProfileRole = "admin" | "dosen" | "mahasiswa" | "super_admin";

type MaterialAccessInput = {
  classStatus: ClassStatus;
  isClassMember: boolean;
  isClassOwner: boolean;
  moduleIsLocked: boolean;
  profileRole: ProfileRole;
};

export function canAccessMaterial({
  classStatus,
  isClassMember,
  isClassOwner,
  moduleIsLocked,
  profileRole,
}: MaterialAccessInput) {
  if (profileRole === "admin" || profileRole === "super_admin") {
    return true;
  }

  if (isClassOwner) {
    return true;
  }

  if (!isClassMember) {
    return false;
  }

  if (profileRole === "mahasiswa") {
    return classStatus === "published" && !moduleIsLocked;
  }

  return profileRole === "dosen";
}

export function canShowStudentModuleContent({
  classStatus,
  moduleIsLocked,
}: {
  classStatus: ClassStatus;
  moduleIsLocked: boolean;
}) {
  return classStatus === "published" && !moduleIsLocked;
}
