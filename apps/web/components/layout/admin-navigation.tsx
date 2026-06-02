"use client";

import { Activity, LayoutDashboard, ScrollText, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/users", icon: Users, label: "User" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Log" },
  { href: "/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/settings", icon: Settings, label: "Pengaturan" },
] as const;

export function AdminDesktopNavigation({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-3">
      {items.map((item) => {
        const href = `${basePath}${item.href}`;
        const active = pathname === href || (item.href !== "/dashboard" && pathname.startsWith(href));
        const Icon = item.icon;

        return (
          <Link
            className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
              active ? "bg-teal-600 text-white" : "text-sky-100/75 hover:bg-white/10 hover:text-white"
            }`}
            href={href}
            key={item.href}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileNavigation({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 py-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden">
      {items.map((item) => {
        const href = `${basePath}${item.href}`;
        const active = pathname === href || (item.href !== "/dashboard" && pathname.startsWith(href));
        const Icon = item.icon;

        return (
          <Link
            className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-semibold transition ${
              active ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
            href={href}
            key={item.href}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
