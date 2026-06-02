import type { AppUserRole, AppUserStatus } from "@/lib/auth";

export type ProfileManagementInput = {
  actorId: string;
  actorRole: AppUserRole;
  nextRole: AppUserRole;
  nextStatus: AppUserStatus;
  targetId: string;
  targetRole: AppUserRole;
};

export function canManageProfile({
  actorId,
  actorRole,
  nextRole,
  targetId,
  targetRole,
}: ProfileManagementInput) {
  if (actorId === targetId) {
    return false;
  }

  if (actorRole === "super_admin") {
    return true;
  }

  return (
    actorRole === "admin" &&
    isStandardRole(targetRole) &&
    isStandardRole(nextRole)
  );
}

export function getAssignableRoles(actorRole: AppUserRole) {
  return actorRole === "super_admin"
    ? (["mahasiswa", "dosen", "admin", "super_admin"] as const)
    : (["mahasiswa", "dosen"] as const);
}

function isStandardRole(role: AppUserRole) {
  return role === "mahasiswa" || role === "dosen";
}
