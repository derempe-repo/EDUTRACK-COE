import { LockKeyhole, Settings, ShieldCheck } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { updateSystemSettingsAction } from "@/features/admin/actions";
import { getSystemSettingsData, type AdminSearchParams } from "@/features/admin/data";
import { getAdminFeedbackNotice } from "@/features/admin/feedback";
import { getAdminBasePath } from "@/features/admin/urls";
import type { AppProfile } from "@/lib/auth";

export async function AdminSettingsPage({
  profile,
  searchParams,
}: {
  profile: AppProfile;
  searchParams: Promise<AdminSearchParams>;
}) {
  const data = await getSystemSettingsData();
  const feedback = getAdminFeedbackNotice(await searchParams);
  const basePath = getAdminBasePath(profile.role);
  const canEdit = profile.role === "super_admin";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: `${basePath}/dashboard`, label: "Dashboard" }, { label: "Pengaturan Sistem" }]} />

      {feedback ? (
        <DismissibleAlert title={feedback.title} tone={feedback.tone}>{feedback.message}</DismissibleAlert>
      ) : null}

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-amber-700">
            <Settings className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Konfigurasi global</p>
            <h2 className="mt-1 text-2xl font-semibold text-amber-950">System Settings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
              Admin dapat meninjau konfigurasi. Hanya Super Admin yang dapat menyimpan perubahan
              global untuk mencegah perubahan kebijakan tanpa sengaja.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form action={updateSystemSettingsAction} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">Pengaturan operasional</h3>
              <p className="mt-1 text-sm text-slate-600">Nilai tersimpan di tabel system_settings.</p>
            </div>
            {!canEdit ? <LockKeyhole className="size-5 text-slate-400" /> : null}
          </div>

          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-4">
            <input
              className="mt-1"
              defaultChecked={data.registrationsEnabled}
              disabled={!canEdit}
              name="registrationsEnabled"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Registrasi mahasiswa baru</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Jika dinonaktifkan, halaman registrasi menolak pembuatan akun baru.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField
              defaultValue={data.plagiarismThresholdPercent}
              disabled={!canEdit}
              label="Threshold plagiarisme (%)"
              max={100}
              min={0}
              name="plagiarismThresholdPercent"
              note="Fondasi untuk local similarity checker Milestone 5."
            />
            <SettingField
              defaultValue={data.auditRetentionDays}
              disabled={!canEdit}
              label="Target retensi audit log (hari)"
              max={365}
              min={7}
              name="auditRetentionDays"
              note="Kebijakan operasional; pembersihan otomatis belum diaktifkan."
            />
          </div>

          {canEdit ? (
            <button className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
              Simpan pengaturan
            </button>
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Mode baca saja untuk Admin. Hubungi Super Admin untuk perubahan.
            </p>
          )}
        </form>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal-700" />
            <h3 className="font-semibold text-slate-950">Matriks permission</h3>
          </div>
          <PermissionRow admin="Kelola" feature="Mahasiswa dan dosen" superAdmin="Kelola" />
          <PermissionRow admin="Baca" feature="Audit log dan monitoring" superAdmin="Baca" />
          <PermissionRow admin="Tidak" feature="Admin dan Super Admin" superAdmin="Kelola" />
          <PermissionRow admin="Baca" feature="System settings" superAdmin="Kelola" />
          <p className="pt-2 text-xs leading-5 text-slate-500">
            Akun sendiri selalu dilindungi dari perubahan role atau status untuk mencegah lockout.
          </p>
        </section>
      </div>
    </div>
  );
}

function SettingField({
  defaultValue,
  disabled,
  label,
  max,
  min,
  name,
  note,
}: {
  defaultValue: number;
  disabled: boolean;
  label: string;
  max: number;
  min: number;
  name: string;
  note: string;
}) {
  return (
    <label className="block space-y-2 rounded-md border border-slate-200 p-4">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        defaultValue={defaultValue}
        disabled={disabled}
        max={max}
        min={min}
        name={name}
        type="number"
      />
      <span className="block text-xs leading-5 text-slate-500">{note}</span>
    </label>
  );
}

function PermissionRow({ admin, feature, superAdmin }: { admin: string; feature: string; superAdmin: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-sm font-semibold text-slate-800">{feature}</p>
      <p className="mt-1 text-xs text-slate-600">Admin: {admin} · Super Admin: {superAdmin}</p>
    </div>
  );
}
