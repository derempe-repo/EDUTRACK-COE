import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  allowResubmitAction,
  createAssignmentAction,
  deleteAssignmentAction,
  reviewSubmissionAction,
  updateAssignmentAction,
} from "@/features/assignments/actions";
import { getDosenModuleAssignmentsDetail } from "@/features/classes/data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenModuleAssignmentsPath,
  getDosenModulePath,
} from "@/features/classes/urls";
import { requireRole } from "@/lib/auth";

type DosenModuleAssignmentsPageProps = {
  params: Promise<{
    classId: string;
    moduleId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const submissionStatusLabels = {
  accepted: "Diterima",
  draft: "Draft",
  locked: "Terkunci",
  rejected: "Ditolak",
  resubmit_allowed: "Resubmit dibuka",
  submitted: "Terkirim",
  under_review: "Direview",
} as const;

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Tanpa tenggat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatDateTimeInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default async function DosenModuleAssignmentsPage({
  params,
  searchParams,
}: DosenModuleAssignmentsPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam, moduleId: moduleParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const data = await getDosenModuleAssignmentsDetail(profile.id, classId, moduleId);
  const feedback = getFeedbackNotice(await searchParams);

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
  const submissionCount = data.moduleItem.steps.reduce(
    (sum, step) =>
      sum + step.assignments.reduce((stepSum, assignment) => stepSum + assignment.submissions.length, 0),
    0,
  );

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

        <section className="space-y-4">
          {data.moduleItem.steps.length > 0 ? (
            data.moduleItem.steps.map((step, index) => (
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
                <div className="space-y-4 p-4">
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
                                Tenggat: {formatDateTime(assignment.dueAt)}
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

                          <details className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50">
                            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-neutral-800 [&::-webkit-details-marker]:hidden">
                              Edit pengaturan tugas
                            </summary>
                            <div className="space-y-3 border-t border-neutral-200 p-4">
                              <form
                                action={updateAssignmentAction}
                                className="grid gap-3 md:grid-cols-[1fr_160px_120px_auto]"
                              >
                                <input name="assignmentId" type="hidden" value={assignment.id} />
                                <Field defaultValue={assignment.title} label="Nama tugas" name="title" required />
                                <Field
                                  defaultValue={formatDateTimeInput(assignment.dueAt)}
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
                                  <span className="text-sm font-medium text-neutral-700">Ganti lampiran PDF</span>
                                  <input
                                    accept=".pdf,application/pdf"
                                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                                    name="attachment"
                                    type="file"
                                  />
                                </label>
                                {assignment.attachmentStoragePath ? (
                                  <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-3">
                                    <input name="removeAttachment" type="checkbox" />
                                    Hapus lampiran tugas saat ini
                                  </label>
                                ) : null}
                                <div className="flex items-end">
                                  <button
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                                    type="submit"
                                  >
                                    <Save className="size-4" />
                                    Simpan
                                  </button>
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

                          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
                            <p className="text-sm font-semibold text-neutral-800">
                              Submission mahasiswa ({assignment.submissions.length})
                            </p>
                            {assignment.submissions.length > 0 ? (
                              <div className="space-y-3">
                                {assignment.submissions.map((submission) => (
                                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3" key={submission.id}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-sky-950">{submission.studentName}</p>
                                        <p className="text-xs text-sky-700">{submission.studentEmail}</p>
                                        <a
                                          className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
                                          href={`/api/submissions/${submission.id}/signed-url`}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          <FileText className="size-4 shrink-0" />
                                          <span className="break-words [overflow-wrap:anywhere]">
                                            {submission.fileName}
                                          </span>
                                          <Download className="size-4 shrink-0" />
                                        </a>
                                        <p className="mt-2 text-xs text-sky-700">
                                          {submissionStatusLabels[submission.status]} -{" "}
                                          {formatDateTime(submission.submittedAt)}
                                        </p>
                                        {submission.note ? (
                                          <p className="mt-2 text-sm leading-6 text-sky-900">
                                            Catatan: {submission.note}
                                          </p>
                                        ) : null}
                                        {submission.feedback ? (
                                          <p className="mt-2 text-sm leading-6 text-sky-900">
                                            Feedback: {submission.feedback}
                                          </p>
                                        ) : null}
                                      </div>
                                      {submission.score !== null ? (
                                        <span className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                          Nilai {submission.score}
                                        </span>
                                      ) : null}
                                    </div>

                                    <form
                                      action={reviewSubmissionAction}
                                      className="mt-4 grid gap-3 border-t border-sky-200 pt-4 md:grid-cols-[140px_110px_1fr_auto]"
                                    >
                                      <input name="submissionId" type="hidden" value={submission.id} />
                                      <label className="block space-y-2">
                                        <span className="text-sm font-medium text-sky-900">Status</span>
                                        <select
                                          className="w-full rounded-md border border-sky-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                                          defaultValue={submission.status === "accepted" ? "accepted" : "rejected"}
                                          name="status"
                                        >
                                          <option value="accepted">Diterima</option>
                                          <option value="rejected">Ditolak</option>
                                        </select>
                                      </label>
                                      <Field
                                        defaultValue={submission.score?.toString() ?? assignment.maxScore.toString()}
                                        label="Nilai"
                                        name="score"
                                        type="number"
                                      />
                                      <TextArea
                                        defaultValue={submission.feedback ?? ""}
                                        label="Feedback"
                                        name="feedback"
                                      />
                                      <div className="flex items-end">
                                        <button
                                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                                          type="submit"
                                        >
                                          <CheckCircle2 className="size-4" />
                                          Verifikasi
                                        </button>
                                      </div>
                                    </form>

                                    {submission.status === "rejected" ||
                                    submission.status === "locked" ||
                                    submission.status === "resubmit_allowed" ? (
                                      <form action={allowResubmitAction} className="mt-3">
                                        <input name="submissionId" type="hidden" value={submission.id} />
                                        <button
                                          className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                                          type="submit"
                                        >
                                          <RotateCcw className="size-4" />
                                          Buka resubmit
                                        </button>
                                      </form>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                                Belum ada submission untuk tugas ini.
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                      Belum ada tugas untuk step ini.
                    </p>
                  )}

                  <form
                    action={createAssignmentAction}
                    className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_120px_auto]"
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
                      <span className="text-sm font-medium text-neutral-700">Lampiran instruksi PDF</span>
                      <input
                        accept=".pdf,application/pdf"
                        className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                        name="attachment"
                        type="file"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                        type="submit"
                      >
                        <Plus className="size-4" />
                        Buat tugas
                      </button>
                    </div>
                  </form>
                </div>
              </CollapsibleSection>
            ))
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
