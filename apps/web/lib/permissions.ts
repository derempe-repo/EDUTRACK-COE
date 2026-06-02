import type { AppUserRole } from "@/lib/auth";

export const appRoles = ["mahasiswa", "dosen", "admin", "super_admin"] as const;

export function isAppRole(value: string): value is AppUserRole {
  return appRoles.includes(value as AppUserRole);
}

export function hasAllowedRole(role: AppUserRole, allowedRoles: readonly AppUserRole[]) {
  return allowedRoles.includes(role);
}
