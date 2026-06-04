import { ArrowLeft, ArrowRight, BarChart3, Lock, Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DosenClassHeader } from "@/components/layout/dosen-class-header";
import { DosenClassNavigation } from "@/components/layout/dosen-class-navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { createModuleAction } from "@/features/classes/actions";
import { getCachedDosenClassDetail } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassMembersPath,
  getDosenClassPath,
  getDosenClassReportsPath,
  getDosenClassSettingsPath,
  getDosenModulePath,
} from "@/features/classes/urls";
import { requireRole } from "@/lib/auth";

type ClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenClassDetailPage({ params, searchParams }: ClassDetailPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const data = await getCachedDosenClassDetail(profile.id, classId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenClassPath(data.classItem);
  if (classParam !== canonicalPath.split("/").at(-1)) {
    redirect(canonicalPath);
  }

  const studentCount = data.members.filter((member) => member.role === "student").length;
  const stepCount = data.modules.reduce((sum, moduleItem) => sum + moduleItem.steps.length, 0);

  return (
    <DashboardShell profile={profile} title={data.classItem.title}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/dosen/dashboard"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <DosenClassHeader
          classItem={data.classItem}
          moduleCount={data.modules.length}
          stepCount={stepCount}
          studentCount={studentCount}
        />
        <DosenClassNavigation classItem={data.classItem} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Struktur kelas</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Modul pembelajaran</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Masuk ke modul untuk mengelola step, materi, tugas, kuis, dan final exam.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{data.modules.length} modul</span>
            </div>

            {data.modules.length > 0 ? (
              <div className="grid gap-4">
                {data.modules.map((moduleItem) => {
                  const moduleMaterialCount = moduleItem.steps.reduce(
                    (sum, step) => sum + step.materials.length,
                    0,
                  );

                  return (
                    <CollapsibleSection
                      defaultOpen={false}
                      eyebrow={`Modul ${moduleItem.sortOrder}`}
                      key={moduleItem.id}
                      meta={
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-1">
                            {moduleItem.steps.length} step
                          </span>
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-1">
                            {moduleMaterialCount} materi
                          </span>
                        </div>
                      }
                      summary={moduleItem.description ?? "Belum ada deskripsi modul."}
                      title={moduleItem.title}
                      tone="module"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                            Modul
                          </span>
                          {moduleItem.isLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                              <Lock className="size-3" />
                              Terkunci
                            </span>
                          ) : (
                            <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              Aktif
                            </span>
                          )}
                        </div>
                        <Link
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#123044] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
                          href={getDosenModulePath(data.classItem, moduleItem)}
                        >
                          Kelola modul
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </CollapsibleSection>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm leading-6 text-slate-600">
                Belum ada modul untuk kelas ini. Gunakan panel modul baru untuk mulai menyusun materi.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <form action={createModuleAction} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <input name="classId" type="hidden" value={data.classItem.id} />
              <div className="border-b border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                    <Plus className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Modul baru</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Tambahkan bab utama kelas.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <Field label="Nama modul" name="title" placeholder="Pengenalan HTML" required />
                <TextArea label="Deskripsi" name="description" />
                <Field defaultValue="1" label="Urutan" name="sortOrder" type="number" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="isLocked" type="checkbox" />
                  Terkunci
                </label>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
                  type="submit"
                >
                  <Plus className="size-4" />
                  Buat modul
                </button>
              </div>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Akses cepat</p>
              <div className="mt-3 grid gap-2">
                <ShortcutLink
                  body={`${studentCount} mahasiswa terdaftar`}
                  href={getDosenClassMembersPath(data.classItem)}
                  icon={<Users className="size-4" />}
                  label="Kelola anggota"
                />
                <ShortcutLink
                  body="Export dan sertifikat"
                  href={getDosenClassReportsPath(data.classItem)}
                  icon={<BarChart3 className="size-4" />}
                  label="Buka laporan"
                />
                <ShortcutLink
                  body="Identitas dan status kelas"
                  href={getDosenClassSettingsPath(data.classItem)}
                  icon={<Settings className="size-4" />}
                  label="Pengaturan kelas"
                />
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function ShortcutLink({
  body,
  href,
  icon,
  label,
}: {
  body: string;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50"
      href={href}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-teal-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{body}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400" />
    </Link>
  );
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        defaultValue={defaultValue}
        min={type === "number" ? 0 : undefined}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        name={name}
      />
    </label>
  );
}
