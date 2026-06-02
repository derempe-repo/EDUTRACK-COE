import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DosenDashboardShell } from "@/components/layout/dosen-dashboard-shell";
import { StudentDashboardShell } from "@/components/layout/student-dashboard-shell";
import { logoutAction } from "@/features/auth/actions";
import { getUnreadNotificationCount } from "@/features/notifications/data";
import type { AppProfile } from "@/lib/auth";

type DashboardShellProps = {
  profile: AppProfile;
  title: string;
  children: ReactNode;
};

export async function DashboardShell({ profile, title, children }: DashboardShellProps) {
  const roleLabel = profile.role.replace("_", " ");
  const unreadNotificationCount = await getUnreadNotificationCount(profile.id);
  const unreadLabel =
    unreadNotificationCount > 99 ? "99+" : unreadNotificationCount.toString();

  if (profile.role === "mahasiswa") {
    return (
      <StudentDashboardShell
        profile={profile}
        title={title}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </StudentDashboardShell>
    );
  }

  if (profile.role === "dosen") {
    return (
      <DosenDashboardShell
        profile={profile}
        title={title}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </DosenDashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white/95 shadow-sm">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-700">EduTrack COE</p>
            <h1 className="mt-1 truncate text-xl font-semibold text-neutral-950 sm:text-2xl">
              {title}
            </h1>
          </div>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <Link
              className="relative inline-flex size-10 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
              href="/notifications"
              title={
                unreadNotificationCount > 0
                  ? `${unreadNotificationCount} notifikasi belum dibaca`
                  : "Notifikasi"
              }
            >
              <Bell className="size-4" />
              {unreadNotificationCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadLabel}
                </span>
              ) : null}
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{profile.name}</p>
              <p className="mt-1 inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-medium capitalize text-indigo-700">
                {roleLabel}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
                type="submit"
              >
                <LogOut className="size-4" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}
