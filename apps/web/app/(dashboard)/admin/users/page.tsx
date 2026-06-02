import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminUsersPage } from "@/features/admin/users-page";
import { requireRole } from "@/lib/auth";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["admin"]);

  return (
    <DashboardShell profile={profile} title="User Management">
      <AdminUsersPage profile={profile} searchParams={searchParams} />
    </DashboardShell>
  );
}
