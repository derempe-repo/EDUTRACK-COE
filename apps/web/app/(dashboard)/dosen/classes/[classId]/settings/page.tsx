import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DosenClassHeader } from "@/components/layout/dosen-class-header";
import { DosenClassNavigation } from "@/components/layout/dosen-class-navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { deleteClassAction, updateClassAction } from "@/features/classes/actions";
import { getDosenClassDetail } from "@/features/classes/data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenClassSettingsPath,
} from "@/features/classes/urls";
import { requireRole } from "@/lib/auth";

type DosenClassSettingsPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenClassSettingsPage({
  params,
  searchParams,
}: DosenClassSettingsPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const data = await getDosenClassDetail(profile.id, classId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenClassSettingsPath(data.classItem);
  if (`/dosen/classes/${classParam}/settings` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const studentCount = data.members.filter((member) => member.role === "student").length;
  const stepCount = data.modules.reduce((sum, moduleItem) => sum + moduleItem.steps.length, 0);

  return (
    <DashboardShell profile={profile} title={`Pengaturan - ${data.classItem.title}`}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              { label: "Pengaturan" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href={getDosenClassPath(data.classItem)}
          >
            <ArrowLeft className="size-4" />
            Kembali ke overview
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

        <section className="max-w-3xl space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Pengaturan utama</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Identitas dan status kelas</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Perubahan status memengaruhi akses mahasiswa terhadap konten kelas.
              </p>
            </div>
            <form action={updateClassAction} className="space-y-4 p-4 sm:p-5">
              <input name="classId" type="hidden" value={data.classItem.id} />
              <Field defaultValue={data.classItem.title} label="Nama kelas" name="title" required />
              <TextArea
                defaultValue={data.classItem.description ?? ""}
                label="Deskripsi"
                name="description"
              />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  defaultValue={data.classItem.status}
                  name="status"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-950">Bobot nilai akhir</p>
                <p className="mt-1 text-xs leading-5 text-teal-800">
                  Nilai akhir dihitung dari rata-rata setiap kategori. Total bobot wajib tepat 100%.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <NumberField
                    defaultValue={data.classItem.assignmentWeight.toString()}
                    label="Tugas (%)"
                    name="assignmentWeight"
                  />
                  <NumberField
                    defaultValue={data.classItem.quizWeight.toString()}
                    label="Kuis (%)"
                    name="quizWeight"
                  />
                  <NumberField
                    defaultValue={data.classItem.finalExamWeight.toString()}
                    label="Final exam (%)"
                    name="finalExamWeight"
                  />
                </div>
              </div>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b] sm:w-auto"
                type="submit"
              >
                <Save className="size-4" />
                Simpan perubahan
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Zona berbahaya</p>
            <h2 className="mt-1 text-base font-semibold text-red-950">Hapus kelas</h2>
            <p className="mt-1 text-sm leading-6 text-red-800">
              Semua modul, step, materi, dan enrollment di dalam kelas akan ikut terhapus.
            </p>
            <form action={deleteClassAction} className="mt-4">
              <input name="classId" type="hidden" value={data.classItem.id} />
              <ConfirmSubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
                message="Hapus kelas ini? Semua modul, step, materi, dan enrollment di dalamnya akan ikut terhapus."
              >
                <Trash2 className="size-4" />
                Hapus kelas
              </ConfirmSubmitButton>
            </form>
          </section>
        </section>
      </div>
    </DashboardShell>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        defaultValue={defaultValue}
        name={name}
        required={required}
      />
    </label>
  );
}

function TextArea({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

function NumberField({
  defaultValue,
  label,
  name,
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-teal-900">{label}</span>
      <input
        className="w-full rounded-md border border-teal-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        defaultValue={defaultValue}
        max="100"
        min="0"
        name={name}
        required
        type="number"
      />
    </label>
  );
}
