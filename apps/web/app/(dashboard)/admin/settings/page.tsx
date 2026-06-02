import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminSettingsPage } from "@/features/admin/settings-page";
import { requireRole } from "@/lib/auth";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["admin"]);
  return <DashboardShell profile={profile} title="Pengaturan Sistem"><AdminSettingsPage profile={profile} searchParams={searchParams} /></DashboardShell>;
}
