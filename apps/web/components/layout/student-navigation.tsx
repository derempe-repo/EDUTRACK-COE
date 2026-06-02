"use client";

import { Bell, BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type StudentNavigationProps = {
  unreadNotificationCount: number;
};

const navigationItems = [
  {
    href: "/mahasiswa/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    isActive: (pathname: string) => pathname === "/mahasiswa/dashboard",
  },
  {
    href: "/mahasiswa/dashboard#kelas-diikuti",
    icon: BookOpen,
    label: "Kelas Saya",
    isActive: (pathname: string) => pathname.startsWith("/mahasiswa/classes"),
  },
  {
    href: "/notifications",
    icon: Bell,
    label: "Notifikasi",
    isActive: (pathname: string) => pathname === "/notifications",
  },
] as const;

function UnreadBadge({ count }: { count: number }) {
  if (count < 1) {
    return null;
  }

  return (
    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-current bg-red-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function StudentDesktopNavigation({
  unreadNotificationCount,
}: StudentNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-4" aria-label="Navigasi mahasiswa">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(pathname);

        return (
          <Link
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-white/12 text-white"
                : "text-sky-100/75 hover:bg-white/8 hover:text-white",
            )}
            href={item.href}
            key={item.label}
          >
            <span className="relative">
              <Icon className="size-4" />
              {item.label === "Notifikasi" ? (
                <UnreadBadge count={unreadNotificationCount} />
              ) : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function StudentMobileNavigation({
  unreadNotificationCount,
}: StudentNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-2 shadow-[0_-4px_18px_rgba(18,48,68,0.08)] lg:hidden"
      aria-label="Navigasi mahasiswa mobile"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(pathname);

        return (
          <Link
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition",
              active ? "text-teal-700" : "text-slate-500 hover:text-slate-800",
            )}
            href={item.href}
            key={item.label}
          >
            <span className="relative">
              <Icon className="size-[18px]" />
              {item.label === "Notifikasi" ? (
                <UnreadBadge count={unreadNotificationCount} />
              ) : null}
            </span>
            <span>{item.label === "Kelas Saya" ? "Kelas" : item.label}</span>
          </Link>
        );
      })}
      <form action={logoutAction}>
        <button
          className="flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
          type="submit"
        >
          <LogOut className="size-[18px]" />
          <span>Keluar</span>
        </button>
      </form>
    </nav>
  );
}
