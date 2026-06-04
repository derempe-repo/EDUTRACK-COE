import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Inbox,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { allowResubmitAction, reviewSubmissionAction } from "@/features/assignments/actions";
import { getCachedDosenAssignmentSubmissionsDetail } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenAssignmentSubmissionsPath,
  getDosenClassPath,
  getDosenModuleAssignmentsPath,
  getDosenModulePath,
} from "@/features/classes/urls";
import {
  allowPlagiarismResubmitAction,
  rejectPermanentPlagiarismAction,
} from "@/features/plagiarism/actions";
import { requireRole } from "@/lib/auth";

type DosenAssignmentSubmissionsPageProps = {
  params: Promise<{
    assignmentId: string;
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

export default async function DosenAssignmentSubmissionsPage({
  params,
  searchParams,
}: DosenAssignmentSubmissionsPageProps) {
  const profile = await requireRole(["dosen"]);
  const {
    assignmentId: assignmentParam,
    classId: classParam,
    moduleId: moduleParam,
  } = await params;
  const resolvedSearchParams = await searchParams;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const assignmentId = extractIdFromSlugParam(assignmentParam);
  const data = await getCachedDosenAssignmentSubmissionsDetail(profile.id, classId, moduleId, assignmentId, {
    page: parsePage(getSingleParam(resolvedSearchParams?.page)),
  });
  const feedback = getFeedbackNotice(resolvedSearchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenAssignmentSubmissionsPath(
    data.classItem,
    data.moduleItem,
    data.assignmentItem,
  );
  if (
    `/dosen/classes/${classParam}/modules/${moduleParam}/assignments/${assignmentParam}/submissions` !==
    canonicalPath
  ) {
    redirect(canonicalPath);
  }

  return (
    <DashboardShell profile={profile} title={`Submission - ${data.assignmentItem.title}`}>
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
              {
                label: "Tugas",
                href: getDosenModuleAssignmentsPath(data.classItem, data.moduleItem),
              },
              { label: "Submission" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            href={getDosenModuleAssignmentsPath(data.classItem, data.moduleItem)}
          >
            <ArrowLeft className="size-4" />
            Kembali ke tugas
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
                Step {data.stepItem.sortOrder} - {data.stepItem.title}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">{data.assignmentItem.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
                Kelola file submission, nilai, feedback, resubmit, dan override similarity untuk
                tugas ini.
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-center">
              <p className="text-2xl font-bold text-white">{data.pagination.totalItems}</p>
              <p className="text-xs font-semibold text-sky-100/75">Submission</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-sky-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-sky-100 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-sky-950">
              <Inbox className="size-4 text-sky-700" />
              Daftar submission
            </p>
            <p className="text-xs text-sky-700">
              {data.pagination.pageSize} data per halaman, terbaru lebih dulu
            </p>
          </div>
          {data.submissions.length > 0 ? (
            <div className="divide-y divide-sky-100">
              {data.submissions.map((submission) => (
                <SubmissionCard
                  assignmentMaxScore={data.assignmentItem.maxScore}
                  key={submission.id}
                  submission={submission}
                />
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-600">Belum ada submission untuk tugas ini.</p>
          )}
          <PaginationControls
            currentPage={data.pagination.page}
            pageSize={data.pagination.pageSize}
            searchParams={resolvedSearchParams}
            totalItems={data.pagination.totalItems}
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function SubmissionCard({
  assignmentMaxScore,
  submission,
}: {
  assignmentMaxScore: number;
  submission: NonNullable<Awaited<ReturnType<typeof getCachedDosenAssignmentSubmissionsDetail>>>["submissions"][number];
}) {
  return (
    <article className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-sky-950">{submission.studentName}</p>
          <p className="break-words text-xs text-sky-700 [overflow-wrap:anywhere]">
            {submission.studentEmail}
          </p>
          <a
            className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
            href={`/api/submissions/${submission.id}/signed-url`}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="size-4 shrink-0" />
            <span className="break-words [overflow-wrap:anywhere]">{submission.fileName}</span>
            <Download className="size-4 shrink-0" />
          </a>
          <p className="mt-2 text-xs text-sky-700">
            {submissionStatusLabels[submission.status]} - {formatDateTime(submission.submittedAt)}
          </p>
          {submission.note ? (
            <p className="mt-2 text-sm leading-6 text-sky-900">Catatan: {submission.note}</p>
          ) : null}
          {submission.feedback ? (
            <p className="mt-2 text-sm leading-6 text-sky-900">Feedback: {submission.feedback}</p>
          ) : null}
        </div>
        {submission.score !== null ? (
          <span className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            Nilai {submission.score}
          </span>
        ) : null}
      </div>

      {submission.plagiarismCheckId ? (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            submission.plagiarismStatus === "flagged"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            Similarity {submission.similarityScore ?? 0}%
          </p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Threshold {submission.thresholdPercent ?? 70}% - ekstraksi{" "}
            {submission.extractionStatus ?? "pending"}
          </p>
        </div>
      ) : null}

      {submission.plagiarismStatus === "flagged" ? (
        <div className="mt-4 space-y-3 border-t border-red-200 pt-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-900">
            Submission dikunci sementara. Periksa file dan hasil similarity sebelum memilih
            keputusan override.
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <form
              action={allowPlagiarismResubmitAction}
              className="rounded-md border border-amber-200 bg-amber-50 p-3"
            >
              <input name="submissionId" type="hidden" value={submission.id} />
              <TextArea label="Alasan perbaikan" name="reason" />
              <SubmitButton
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                pendingLabel="Membuka ulang..."
              >
                <RotateCcw className="size-4" />
                Izinkan ulang upload
              </SubmitButton>
            </form>
            <form
              action={rejectPermanentPlagiarismAction}
              className="rounded-md border border-red-200 bg-red-50 p-3"
            >
              <input name="submissionId" type="hidden" value={submission.id} />
              <TextArea label="Alasan penolakan permanen" name="reason" />
              <ConfirmSubmitButton
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
                message="Tolak permanen submission ini dan tetapkan nilai 0?"
              >
                <AlertTriangle className="size-4" />
                Tolak permanen
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
      ) : (
        <details className="group mt-4 rounded-md border border-sky-200 bg-sky-50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-sky-900 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-sky-700" />
              Penilaian dan feedback
            </span>
            <ChevronDown className="size-4 text-sky-700 transition group-open:rotate-180" />
          </summary>
          <form
            action={reviewSubmissionAction}
            className="grid gap-3 border-t border-sky-200 bg-white p-3 md:grid-cols-[140px_110px_1fr_auto]"
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
              defaultValue={submission.score?.toString() ?? assignmentMaxScore.toString()}
              label="Nilai"
              name="score"
              type="number"
            />
            <TextArea defaultValue={submission.feedback ?? ""} label="Feedback" name="feedback" />
            <div className="flex items-end">
              <SubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                pendingLabel="Memverifikasi..."
              >
                <CheckCircle2 className="size-4" />
                Verifikasi
              </SubmitButton>
            </div>
          </form>
        </details>
      )}

      {submission.status === "rejected" || submission.status === "resubmit_allowed" ? (
        <form action={allowResubmitAction} className="mt-3">
          <input name="submissionId" type="hidden" value={submission.id} />
          <SubmitButton
            className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            pendingLabel="Membuka resubmit..."
          >
            <RotateCcw className="size-4" />
            Buka resubmit
          </SubmitButton>
        </form>
      ) : null}
    </article>
  );
}

function Field({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
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

type DateLike = Date | string | null;

function formatDateTime(value: DateLike) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
