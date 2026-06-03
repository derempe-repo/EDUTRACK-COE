import type { AppProfile } from "@/lib/auth";

export function getProfileInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getRoleLabel(role: AppProfile["role"]) {
  if (role === "super_admin") {
    return "Super Admin";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "dosen") {
    return "Dosen";
  }

  return "Mahasiswa";
}

export function UserProfileBadge({
  profile,
  roleLabel = getRoleLabel(profile.role),
}: {
  profile: AppProfile;
  roleLabel?: string;
}) {
  return (
    <div
      className="flex min-w-0 max-w-[168px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left sm:max-w-[240px] sm:px-3"
      title={`${profile.name} - ${roleLabel}`}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
        {getProfileInitials(profile.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold leading-4 text-slate-900 sm:text-sm">
          {profile.name}
        </span>
        <span className="block truncate text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">
          {roleLabel}
        </span>
      </span>
    </div>
  );
}
