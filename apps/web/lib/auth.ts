import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AppUserRole = "mahasiswa" | "dosen" | "admin" | "super_admin";
export type AppUserStatus = "active" | "inactive";

export type AppProfile = {
  id: string;
  name: string;
  email: string;
  role: AppUserRole;
  status: AppUserStatus;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: AppUserRole;
  status: AppUserStatus;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getProfileByUserId(user.id);
}

export async function getProfileByUserId(userId: string): Promise<AppProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,role,status,avatar_url,last_login_at,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    avatarUrl: data.avatar_url,
    lastLoginAt: data.last_login_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireActiveProfile() {
  const user = await requireUser();
  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    redirect("/login?error=profile_not_found");
  }

  if (profile.status !== "active") {
    redirect("/login?error=inactive");
  }

  return profile;
}

export async function requireRole(allowedRoles: readonly AppUserRole[]) {
  const profile = await requireActiveProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return profile;
}

export function getDashboardPathForRole(role: AppUserRole) {
  const paths = {
    mahasiswa: "/mahasiswa/dashboard",
    dosen: "/dosen/dashboard",
    admin: "/admin/dashboard",
    super_admin: "/super-admin/dashboard",
  } satisfies Record<AppUserRole, string>;

  return paths[role];
}
