"use client";

import { BarChart3, BookOpen, Settings, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getDosenClassMembersPath,
  getDosenClassPath,
  getDosenClassPlagiarismPath,
  getDosenClassReportsPath,
  getDosenClassSettingsPath,
} from "@/features/classes/urls";
import { cn } from "@/lib/utils";

type DosenClassNavigationProps = {
  classItem: {
    id: string;
    title: string;
  };
};

export function DosenClassNavigation({ classItem }: DosenClassNavigationProps) {
  const pathname = usePathname();
  const items = [
    {
      href: getDosenClassPath(classItem),
      icon: BookOpen,
      label: "Overview & Modul",
    },
    {
      href: getDosenClassMembersPath(classItem),
      icon: Users,
      label: "Anggota",
    },
    {
      href: getDosenClassReportsPath(classItem),
      icon: BarChart3,
      label: "Laporan",
    },
    {
      href: getDosenClassPlagiarismPath(classItem),
      icon: ShieldAlert,
      label: "Plagiasi",
    },
    {
      href: getDosenClassSettingsPath(classItem),
      icon: Settings,
      label: "Pengaturan",
    },
  ];

  return (
    <nav
      aria-label="Navigasi kelas"
      className="overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 shadow-sm"
    >
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition",
                active
                  ? "border-teal-600 text-teal-800"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
