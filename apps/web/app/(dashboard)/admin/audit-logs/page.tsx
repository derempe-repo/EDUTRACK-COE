import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminAuditLogsPage } from "@/features/admin/audit-logs-page";
import { requireRole } from "@/lib/auth";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["admin"]);

  return (
    <DashboardShell profile={profile} title="Audit Log">
      <AdminAuditLogsPage profile={profile} searchParams={searchParams} />
    </DashboardShell>
  );
}
