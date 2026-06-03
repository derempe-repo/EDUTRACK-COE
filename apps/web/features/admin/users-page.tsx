import { Search, ShieldCheck, UserCheck } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { updateManagedProfileAction } from "@/features/admin/actions";
import { getAdminUsersData, type AdminSearchParams } from "@/features/admin/data";
import { getAdminFeedbackNotice } from "@/features/admin/feedback";
import { canManageProfile, getAssignableRoles } from "@/features/admin/permissions";
import { getAdminBasePath } from "@/features/admin/urls";
import type { AppProfile, AppUserRole } from "@/lib/auth";

export async function AdminUsersPage({
  profile,
  searchParams,
}: {
  profile: AppProfile;
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getAdminUsersData(resolvedSearchParams);
  const feedback = getAdminFeedbackNotice(resolvedSearchParams);
  const basePath = getAdminBasePath(profile.role);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: `${basePath}/dashboard`, label: "Dashboard" }, { label: "User Management" }]} />

      {feedback ? (
        <DismissibleAlert title={feedback.title} tone={feedback.tone}>
          {feedback.message}
        </DismissibleAlert>
      ) : null}

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-800">Administrasi akun</p>
            <h2 className="mt-1 text-2xl font-semibold text-teal-950">User Management</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-900">
              Cari user, tinjau role, lalu aktifkan atau nonaktifkan akses aplikasi. Perubahan
              dicatat ke audit log.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Mahasiswa" value={data.roleCounts.mahasiswa ?? 0} />
            <MiniStat label="Dosen" value={data.roleCounts.dosen ?? 0} />
            <MiniStat label="Admin" value={data.roleCounts.admin ?? 0} />
            <MiniStat label="Super Admin" value={data.roleCounts.super_admin ?? 0} />
          </div>
        </div>
      </section>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
          <input
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            defaultValue={data.filters.query}
            name="q"
            placeholder="Cari nama atau email"
          />
        </label>
        <select className={selectClassName} defaultValue={data.filters.role ?? ""} name="role">
          <option value="">Semua role</option>
          <option value="mahasiswa">Mahasiswa</option>
          <option value="dosen">Dosen</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select className={selectClassName} defaultValue={data.filters.status ?? ""} name="status">
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
          Terapkan
        </button>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">{data.pagination.totalItems} user ditemukan</p>
        </div>
        {data.users.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {data.users.map((user) => {
              const editable = canManageProfile({
                actorId: profile.id,
                actorRole: profile.role,
                nextRole: user.role,
                nextStatus: user.status,
                targetId: user.id,
                targetRole: user.role,
              });

              return (
                <article className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,auto)] xl:items-center" key={user.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-950">{user.name}</h3>
                      <RoleBadge role={user.role} />
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${user.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Terdaftar {formatDate(user.createdAt)} · Login terakhir {formatDate(user.lastLoginAt)}
                    </p>
                  </div>

                  {editable ? (
                    <form action={updateManagedProfileAction} className="grid gap-2 sm:grid-cols-[160px_140px_auto]">
                      <input name="profileId" type="hidden" value={user.id} />
                      <select className={selectClassName} defaultValue={user.role} name="role">
                        {getAssignableRoles(profile.role).map((role) => (
                          <option key={role} value={role}>{formatRole(role)}</option>
                        ))}
                      </select>
                      <select className={selectClassName} defaultValue={user.status} name="status">
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                      <ConfirmSubmitButton
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                        message={`Simpan perubahan akses untuk ${user.name}?`}
                      >
                        <UserCheck className="size-4" />
                        Simpan
                      </ConfirmSubmitButton>
                    </form>
                  ) : (
                    <p className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <ShieldCheck className="size-4" />
                      Akun dilindungi dari perubahan oleh role Anda.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-600">Tidak ada user yang cocok dengan filter.</p>
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

const selectClassName = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-md border border-teal-200 bg-white px-3 py-2 text-center">
      <p className="text-xl font-semibold text-teal-950">{value}</p>
      <p className="text-xs text-teal-700">{label}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: AppUserRole }) {
  return (
    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
      {formatRole(role)}
    </span>
  );
}

function formatRole(role: AppUserRole) {
  return role === "super_admin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "-";
}
