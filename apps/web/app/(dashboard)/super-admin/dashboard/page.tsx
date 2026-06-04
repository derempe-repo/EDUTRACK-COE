import { Activity, BookOpen, ShieldCheck, Users } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCachedSuperAdminDashboardData } from "@/features/classes/cached-data";
import { requireRole } from "@/lib/auth";

export default async function SuperAdminDashboardPage() {
  const profile = await requireRole(["super_admin"]);
  const data = await getCachedSuperAdminDashboardData();

  return (
    <DashboardShell profile={profile} title="Dashboard Super Admin">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={<Users className="size-5" />} label="User Aktif" value={data.stats.activeUsers} />
          <StatCard icon={<Users className="size-5" />} label="Total User" value={data.stats.totalUsers} />
          <StatCard icon={<BookOpen className="size-5" />} label="Kelas" value={data.stats.totalClasses} />
          <StatCard
            icon={<BookOpen className="size-5" />}
            label="Published"
            value={data.stats.publishedClasses}
          />
          <StatCard
            icon={<ShieldCheck className="size-5" />}
            label="Audit Log"
            value={data.stats.auditLogCount}
          />
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <Activity className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Audit Log Global</h2>
              <p className="text-sm text-neutral-500">Jejak aktivitas lintas role.</p>
            </div>
          </div>
          {data.recentAuditLogs.length > 0 ? (
            <div className="divide-y divide-neutral-200">
              {data.recentAuditLogs.map((log) => (
                <div className="flex items-center justify-between gap-4 py-3" key={log.id}>
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-neutral-500">{log.actorRole ?? "system"}</p>
                  </div>
                  <time className="text-xs text-neutral-500">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(log.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">Belum ada audit log.</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <div className="rounded-md bg-indigo-50 p-2 text-indigo-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
