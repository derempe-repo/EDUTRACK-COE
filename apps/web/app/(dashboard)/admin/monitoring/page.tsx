import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminMonitoringPage } from "@/features/admin/monitoring-page";
import { requireRole } from "@/lib/auth";

export default async function MonitoringPage() {
  const profile = await requireRole(["admin"]);
  return <DashboardShell profile={profile} title="Monitoring"><AdminMonitoringPage profile={profile} /></DashboardShell>;
}
