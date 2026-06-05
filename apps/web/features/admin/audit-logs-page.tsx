import { Search, ScrollText } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAuditLogData, type AdminSearchParams } from "@/features/admin/data";
import { getAdminBasePath } from "@/features/admin/urls";
import { formatAppDateTime } from "@/lib/app-time";
import type { AppProfile } from "@/lib/auth";

export async function AdminAuditLogsPage({
  profile,
  searchParams,
}: {
  profile: AppProfile;
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getAuditLogData(resolvedSearchParams);
  const basePath = getAdminBasePath(profile.role);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: `${basePath}/dashboard`, label: "Dashboard" }, { label: "Audit Log" }]} />

      <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-indigo-700">
            <ScrollText className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Jejak aktivitas sistem</p>
            <h2 className="mt-1 text-2xl font-semibold text-indigo-950">Audit Log</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-900">
              Telusuri perubahan penting lintas role. Detail teknis disimpan dalam bagian yang dapat
              dibuka agar daftar tetap mudah dipindai.
            </p>
          </div>
        </div>
      </section>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
          <input
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            defaultValue={data.filters.query}
            name="q"
            placeholder="Cari action atau entity"
          />
        </label>
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          defaultValue={data.filters.role ?? ""}
          name="role"
        >
          <option value="">Semua role</option>
          <option value="mahasiswa">Mahasiswa</option>
          <option value="dosen">Dosen</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <SubmitButton
          className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          pendingLabel="Menerapkan..."
        >
          Terapkan
        </SubmitButton>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">{data.pagination.totalItems} aktivitas ditemukan</p>
        </div>
        {data.logs.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {data.logs.map((log) => (
              <article className="p-4" key={log.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-semibold text-slate-950">{log.action}</p>
                      {log.entityType ? (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          {log.entityType}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {log.actorName ?? "System / anonymous"} · {formatRole(log.actorRole)}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">{formatDate(log.createdAt)}</time>
                </div>

                <details className="mt-3 rounded-md border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                    Lihat detail aktivitas
                  </summary>
                  <div className="grid gap-2 border-t border-slate-200 px-3 py-3 text-xs leading-5 text-slate-600">
                    <p><span className="font-semibold text-slate-800">Entity ID:</span> {log.entityId ?? "-"}</p>
                    <p><span className="font-semibold text-slate-800">IP:</span> {log.ipAddress ?? "-"}</p>
                    <p className="break-words"><span className="font-semibold text-slate-800">User agent:</span> {log.userAgent ?? "-"}</p>
                    <pre className="max-h-56 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] leading-5 text-slate-100">
                      {JSON.stringify(log.metadata ?? {}, null, 2)}
                    </pre>
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-600">Belum ada audit log yang cocok dengan filter.</p>
        )}
        <PaginationControls
          currentPage={data.pagination.page}
          pageSize={data.pagination.pageSize}
          searchParams={resolvedSearchParams}
          totalItems={data.pagination.totalItems}
        />
      </section>
    </div>
  );
}

function formatDate(value: Date) {
  return formatAppDateTime(value);
}

function formatRole(value: string | null) {
  return value ? value.replace("_", " ") : "system";
}
