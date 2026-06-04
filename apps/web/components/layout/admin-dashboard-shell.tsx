import { BookOpen, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  AdminDesktopNavigation,
  AdminMobileNavigation,
} from "@/components/layout/admin-navigation";
import {
  getProfileInitials,
  getRoleLabel,
  UserProfileBadge,
} from "@/components/layout/user-profile-badge";
import { logoutAction } from "@/features/auth/actions";
import { getAdminBasePath } from "@/features/admin/urls";
import type { AppProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";

type AdminDashboardShellProps = {
  children: ReactNode;
  profile: AppProfile;
  title: string;
};

export function AdminDashboardShell({
  children,
  profile,
  title,
}: AdminDashboardShellProps) {
  const basePath = getAdminBasePath(profile.role);
  const roleLabel = getRoleLabel(profile.role);

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#123044]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col bg-[#123044] text-white lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-600">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">EDUTRACK COE</p>
            <p className="mt-0.5 text-xs text-sky-100/65">Pusat kendali sistem</p>
          </div>
        </div>

        <div className="px-7 pb-3 pt-6 text-[11px] font-semibold uppercase tracking-wide text-sky-100/55">
          Administrasi
        </div>
        <AdminDesktopNavigation basePath={basePath} />

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold">
              {getProfileInitials(profile.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="mt-0.5 text-xs text-sky-100/60">{roleLabel}</p>
            </div>
            <form action={logoutAction}>
              <SubmitButton
                aria-label="Keluar"
                className="inline-flex size-9 items-center justify-center rounded-md text-sky-100/70 transition hover:bg-white/10 hover:text-white"
                pendingChildren={<Loader2 className="size-4 animate-spin" />}
                title="Keluar"
              >
                <LogOut className="size-4" />
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{roleLabel}</p>
              <h1 className="mt-1 truncate text-lg font-semibold text-slate-900">{title}</h1>
            </div>
            <Link className="flex min-w-0 items-center gap-2.5 lg:hidden" href={`${basePath}/dashboard`}>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">EDUTRACK COE</p>
                <p className="truncate text-[10px] text-slate-500">{roleLabel}</p>
              </div>
            </Link>
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <UserProfileBadge profile={profile} roleLabel={roleLabel} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <AdminMobileNavigation basePath={basePath} />
    </div>
  );
}
