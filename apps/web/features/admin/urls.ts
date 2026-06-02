import type { AppUserRole } from "@/lib/auth";

export function getAdminBasePath(role: AppUserRole) {
  return role === "super_admin" ? "/super-admin" : "/admin";
}
