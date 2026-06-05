import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Inbox,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createAssignmentAction,
  deleteAssignmentAction,
  updateAssignmentAction,
} from "@/features/assignments/actions";
import { getCachedDosenModuleAssignmentsDetail } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenAssignmentSubmissionsPath,
  getDosenClassPath,
  getDosenModuleAssignmentsPath,
  getDosenModulePath,
} from "@/features/classes/urls";
import { LMS_ALLOWED_FILE_DESCRIPTION, LMS_FILE_ACCEPT } from "@/features/files/lms-file-types";
import { formatAppDateTime, formatAppDateTimeInput } from "@/lib/app-time";
import { requireRole } from "@/lib/auth";

type DosenModuleAssignmentsPageProps = {
  params: Promise<{
    classId: string;
    moduleId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenModuleAssignmentsPage({
  params,
  searchParams,
}: DosenModuleAssignmentsPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam, moduleId: moduleParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const resolvedSearchParams = await searchParams;
  const data = await getCachedDosenModuleAssignmentsDetail(profile.id, classId, moduleId);
  const feedback = getFeedbackNotice(resolvedSearchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenModuleAssignmentsPath(data.classItem, data.moduleItem);
  if (`/dosen/classes/${classParam}/modules/${moduleParam}/assignments` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const assignmentCount = data.moduleItem.steps.reduce(
    (sum, step) => sum + step.assignments.length,
    0,
  );
  const submissionCount = data.moduleItem.totalSubmissionCount;

  return (
    <DashboardShell profile={profile} title={`Tugas - ${data.moduleItem.title}`}>
      <div className="space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              {
                label: `Modul-${data.moduleItem.title}`,
                href: getDosenModulePath(data.classItem, data.moduleItem),
              },
              { label: "Tugas" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            href={getDosenModulePath(data.classItem, data.moduleItem)}
          >
            <ArrowLeft className="size-4" />
            Kembali ke modul
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-[#123044] p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
                {data.classItem.title}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">Tugas Modul</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
                Kelola instruksi tugas, lampiran PDF, submission mahasiswa, nilai, feedback,
                dan resubmit dari satu halaman yang khusus untuk modul ini.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-64">
              <MiniStat label="Tugas" value={assignmentCount} />
              <MiniStat label="Submission" value={submissionCount} />
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                Daftar tugas
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Tugas per step</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Buka step untuk mengelola tugas. Submission dan form penilaian dapat dibuka saat
                diperlukan.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500">{assignmentCount} tugas</span>
          </div>
          {data.moduleItem.steps.length > 0 ? (
            <>
              {data.moduleItem.steps.map((step, index) => (
              <CollapsibleSection
                defaultOpen={index === 0}
                eyebrow={`Step ${step.sortOrder}`}
                key={step.id}
                meta={
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
                      {step.assignments.length} tugas
                    </span>
                  </div>
                }
                summary={step.description ?? "Belum ada deskripsi step."}
                title={step.title}
                tone="step"
              >
                <div className="min-w-0 space-y-4">
                  {step.assignments.length > 0 ? (
                    <div className="space-y-4">
                      {step.assignments.map((assignment) => (
                        <article
                          className="rounded-lg border border-indigo-200 bg-white p-4 shadow-sm"
                          key={assignment.id}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-neutral-950">{assignment.title}</h3>
                                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                                  Maks {assignment.maxScore}
                                </span>
                                <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
                                  {assignment.isActive ? "Aktif" : "Nonaktif"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-neutral-600">
                                {assignment.description ?? "Belum ada deskripsi tugas."}
                              </p>
                              <p className="mt-2 text-xs font-medium text-neutral-500">
                                Tenggat: {formatAppDateTime(assignment.dueAt, { fallback: "Tanpa tenggat" })}
                              </p>
                              {assignment.attachmentStoragePath ? (
                                <a
                                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                                  href={`/api/assignments/${assignment.id}/attachment`}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <FileText className="size-4 shrink-0" />
                                  <span className="break-words [overflow-wrap:anywhere]">
                                    {assignment.attachmentFileName ?? "Lampiran tugas"}
                                  </span>
                                  <Download className="size-4 shrink-0" />
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <details className="group mt-4 rounded-md border border-neutral-200 bg-neutral-50">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-neutral-800 [&::-webkit-details-marker]:hidden">
                              <span className="inline-flex items-center gap-2">
                                <Settings className="size-4 text-neutral-500" />
                                Pengaturan tugas
                              </span>
                              <ChevronDown className="size-4 text-neutral-500 transition group-open:rotate-180" />
                            </summary>
                            <div className="space-y-3 border-t border-neutral-200 p-4">
                              <form
                                action={updateAssignmentAction}
                                className="grid gap-3 md:grid-cols-[1fr_160px_120px_auto]"
                              >
                                <input name="assignmentId" type="hidden" value={assignment.id} />
                                <Field defaultValue={assignment.title} label="Nama tugas" name="title" required />
                                <Field
                                  defaultValue={formatAppDateTimeInput(assignment.dueAt)}
                                  label="Tenggat"
                                  name="dueAt"
                                  type="datetime-local"
                                />
                                <Field
                                  defaultValue={assignment.maxScore.toString()}
                                  label="Nilai maks"
                                  name="maxScore"
                                  type="number"
                                />
                                <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                                  <input defaultChecked={assignment.isActive} name="isActive" type="checkbox" />
                                  Aktif
                                </label>
                                <div className="md:col-span-3">
                                  <TextArea
                                    defaultValue={assignment.description ?? ""}
                                    label="Deskripsi tugas"
                                    name="description"
                                  />
                                </div>
                                <label className="block space-y-2 md:col-span-3">
                                  <span className="text-sm font-medium text-neutral-700">Ganti lampiran</span>
                                  <input
                                    accept={LMS_FILE_ACCEPT}
                                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                                    name="attachment"
                                    type="file"
                                  />
                                  <span className="block text-xs leading-5 text-neutral-500">
                                    {LMS_ALLOWED_FILE_DESCRIPTION} Maksimal 4 MB.
                                  </span>
                                </label>
                                {assignment.attachmentStoragePath ? (
                                  <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-3">
                                    <input name="removeAttachment" type="checkbox" />
                                    Hapus lampiran tugas saat ini
                                  </label>
                                ) : null}
                                <div className="flex items-end">
                                  <SubmitButton
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                                    pendingLabel="Menyimpan..."
                                  >
                                    <Save className="size-4" />
                                    Simpan
                                  </SubmitButton>
                                </div>
                              </form>
                              <form action={deleteAssignmentAction}>
                                <input name="assignmentId" type="hidden" value={assignment.id} />
                                <ConfirmSubmitButton
                                  className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                                  message={`Hapus tugas "${assignment.title}"? Tugas hanya bisa dihapus jika belum ada submission.`}
                                >
                                  <Trash2 className="size-4" />
                                  Hapus tugas
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </details>

                          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50/70 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="inline-flex items-center gap-2 text-sm font-semibold text-sky-950">
                                  <Inbox className="size-4 text-sky-700" />
                                  Submission mahasiswa
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                  <span className="rounded-md border border-sky-200 bg-white px-2 py-1 text-sky-800">
                                    Total {assignment.submissionSummary.total}
                                  </span>
                                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                                    Perlu review {assignment.submissionSummary.pendingReview}
                                  </span>
                                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                                    Diterima {assignment.submissionSummary.accepted}
                                  </span>
                                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-800">
                                    Ditolak {assignment.submissionSummary.rejected}
                                  </span>
                                  <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800">
                                    Flagged {assignment.submissionSummary.flagged}
                                  </span>
                                </div>
                              </div>
                              <Link
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 sm:w-fit"
                                href={getDosenAssignmentSubmissionsPath(data.classItem, data.moduleItem, assignment)}
                              >
                                <Inbox className="size-4" />
                                Lihat submission
                              </Link>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                      Belum ada tugas untuk step ini.
                    </p>
                  )}

                  <details className="group rounded-md border border-slate-200 bg-slate-50">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <Plus className="size-4 text-teal-700" />
                        Tambah tugas pada step ini
                      </span>
                      <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
                    </summary>
                    <form
                      action={createAssignmentAction}
                      className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_120px_auto]"
                    >
                      <input name="stepId" type="hidden" value={step.id} />
                      <Field label="Nama tugas" name="title" placeholder="Upload laporan praktik" required />
                      <Field label="Tenggat" name="dueAt" type="datetime-local" />
                      <Field defaultValue="100" label="Nilai maks" name="maxScore" type="number" />
                      <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                        <input defaultChecked name="isActive" type="checkbox" />
                        Aktif
                      </label>
                      <div className="md:col-span-3">
                        <TextArea label="Deskripsi tugas" name="description" />
                      </div>
                      <label className="block space-y-2 md:col-span-3">
                        <span className="text-sm font-medium text-neutral-700">
                          Lampiran instruksi
                        </span>
                        <input
                          accept={LMS_FILE_ACCEPT}
                          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                          name="attachment"
                          type="file"
                        />
                        <span className="block text-xs leading-5 text-neutral-500">
                          {LMS_ALLOWED_FILE_DESCRIPTION} Maksimal 4 MB.
                        </span>
                      </label>
                      <div className="flex items-end">
                        <SubmitButton
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                          pendingLabel="Membuat tugas..."
                        >
                          <Plus className="size-4" />
                          Buat tugas
                        </SubmitButton>
                      </div>
                    </form>
                  </details>
                </div>
              </CollapsibleSection>
              ))}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
              Belum ada step untuk modul ini. Buat step dari halaman modul sebelum menambahkan tugas.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs font-semibold text-sky-100/75">{label}</p>
    </div>
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
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
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
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}
