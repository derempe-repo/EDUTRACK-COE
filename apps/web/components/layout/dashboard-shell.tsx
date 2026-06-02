import type { ReactNode } from "react";

import { DosenDashboardShell } from "@/components/layout/dosen-dashboard-shell";
import { StudentDashboardShell } from "@/components/layout/student-dashboard-shell";
import { AdminDashboardShell } from "@/components/layout/admin-dashboard-shell";
import { getUnreadNotificationCount } from "@/features/notifications/data";
import type { AppProfile } from "@/lib/auth";

type DashboardShellProps = {
  profile: AppProfile;
  title: string;
  children: ReactNode;
};

export async function DashboardShell({ profile, title, children }: DashboardShellProps) {
  const unreadNotificationCount = await getUnreadNotificationCount(profile.id);

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
    <AdminDashboardShell
      profile={profile}
      title={title}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AdminDashboardShell>
  );
}
