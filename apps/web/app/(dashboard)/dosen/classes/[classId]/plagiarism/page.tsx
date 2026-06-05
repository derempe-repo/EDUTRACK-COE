import { AlertTriangle, ArrowLeft, Download, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DosenClassNavigation } from "@/components/layout/dosen-class-navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenClassPlagiarismPath,
} from "@/features/classes/urls";
import {
  allowPlagiarismResubmitAction,
  rejectPermanentPlagiarismAction,
  rerunPlagiarismCheckAction,
} from "@/features/plagiarism/actions";
import { getDosenClassPlagiarismReport } from "@/features/plagiarism/data";
import { formatAppDateTime } from "@/lib/app-time";
import { requireRole } from "@/lib/auth";

type DosenClassPlagiarismPageProps = {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels = {
  flagged: "Perlu ditinjau",
  needs_review: "Cek manual",
  passed: "Lolos",
  pending: "Diproses",
  rejected_permanent: "Ditolak permanen",
  resubmit_allowed: "Resubmit dibuka",
} as const;

const detectionMethodLabels = {
  exact_file: "Hash file identik",
  exact_text: "Hash teks identik",
  extraction_failed: "Ekstraksi gagal",
  none: "Tidak ada kemiripan",
  text_similarity: "Similarity teks",
} as const;

export default async function DosenClassPlagiarismPage({
  params,
  searchParams,
}: DosenClassPlagiarismPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const data = await getDosenClassPlagiarismReport(profile.id, classId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenClassPlagiarismPath(data.classItem);
  if (`/dosen/classes/${classParam}/plagiarism` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const flaggedCount = data.checks.filter((check) => check.status === "flagged").length;
  const needsReviewCount = data.checks.filter((check) => check.status === "needs_review").length;
  const passedCount = data.checks.filter((check) => check.status === "passed").length;

  return (
    <DashboardShell profile={profile} title={`Plagiasi - ${data.classItem.title}`}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              { label: "Plagiasi" },
            ]}
          />
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950" href={getDosenClassPath(data.classItem)}>
            <ArrowLeft className="size-4" />
            Kembali ke overview
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">Similarity tugas</p>
              <h1 className="mt-2 text-2xl font-semibold text-red-950">Laporan Plagiasi</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-900">
                Skor similarity adalah indikator untuk ditinjau, bukan keputusan otomatis. Periksa file mahasiswa sebelum melakukan override.
              </p>
            </div>
            <ShieldAlert className="size-8 shrink-0 text-red-700" />
          </div>
        </section>

        <DosenClassNavigation classItem={data.classItem} />

        <section className="grid gap-3 sm:grid-cols-4">
          <Metric label="Submission dicek" value={data.checks.length} />
          <Metric label="Perlu ditinjau" tone="red" value={flaggedCount} />
          <Metric label="Cek manual" tone="amber" value={needsReviewCount} />
          <Metric label="Lolos" tone="emerald" value={passedCount} />
        </section>

        <section className="space-y-4">
          {data.checks.length > 0 ? (
            data.checks.map((check) => (
              <article
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={check.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{check.moduleTitle}</p>
                    <h2 className="mt-1 break-words font-semibold text-slate-950 [overflow-wrap:anywhere]">
                      {check.assignmentTitle}
                    </h2>
                    <p className="mt-1 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
                      {check.studentName} - {check.studentEmail}
                    </p>
                    <a className="mt-3 flex w-full min-w-0 items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 sm:inline-flex sm:w-fit sm:max-w-full" href={`/api/submissions/${check.submissionId}/signed-url`} target="_blank">
                      <FileText className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{check.fileName}</span>
                      <Download className="size-4 shrink-0" />
                    </a>
                  </div>
                  <div className={`w-fit max-w-full break-words rounded-md border px-3 py-2 text-sm font-semibold [overflow-wrap:anywhere] ${getStatusTone(check.status)}`}>
                    {check.similarityScore}% - {statusLabels[check.status]}
                  </div>
                </div>

                <p className="mt-3 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
                  Threshold {check.thresholdPercent}% - metode{" "}
                  {getDetectionMethodLabel(check.detectionMethod)} -
                  ekstraksi {check.extractionStatus} - dicek {formatDate(check.checkedAt)}
                </p>
                {check.extractionError ? (
                  <p className="mt-1 break-words text-xs leading-5 text-amber-700 [overflow-wrap:anywhere]">
                    {check.extractionError}
                  </p>
                ) : null}
                {check.status === "needs_review" ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                    Sistem belum bisa memastikan isi file secara otomatis. Dosen dapat download file,
                    cek manual, lalu menekan Cek ulang jika parser/hash sudah diperbaiki.
                  </p>
                ) : null}

                <form action={rerunPlagiarismCheckAction} className="mt-4">
                  <input name="submissionId" type="hidden" value={check.submissionId} />
                  <SubmitButton
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                    pendingLabel="Mengecek ulang..."
                  >
                    <RotateCcw className="size-4" />
                    Cek ulang plagiasi
                  </SubmitButton>
                </form>

                <details className="mt-4 rounded-md border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer break-words px-3 py-3 text-sm font-semibold text-slate-800 [overflow-wrap:anywhere]">Pasangan similarity ({check.matches.length})</summary>
                  <div className="space-y-2 border-t border-slate-200 p-3">
                    {check.matches.length > 0 ? check.matches.map((match) => (
                      <div className="flex min-w-0 flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" key={match.matchedSubmissionId}>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{match.studentName}</p>
                          <p className="break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{match.studentEmail}</p>
                        </div>
                        <a className="flex w-full min-w-0 items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900 sm:inline-flex sm:w-fit sm:max-w-full" href={`/api/submissions/${match.matchedSubmissionId}/signed-url`} target="_blank">
                          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{match.fileName}</span>
                          <Download className="size-4 shrink-0" />
                          <span className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{match.similarityScore}%</span>
                        </a>
                      </div>
                    )) : <p className="text-sm text-slate-600">Belum ada pasangan submission yang mirip.</p>}
                  </div>
                </details>

                {check.status === "flagged" ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <OverrideForm action={allowPlagiarismResubmitAction} buttonLabel="Izinkan ulang upload" submissionId={check.submissionId} tone="amber" />
                    <OverrideForm action={rejectPermanentPlagiarismAction} buttonLabel="Tolak permanen" submissionId={check.submissionId} tone="red" />
                  </div>
                ) : null}

                {check.overrides.length > 0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-900">Riwayat override</p>
                    <div className="mt-2 space-y-2">
                      {check.overrides.map((item) => (
                        <div className="break-words rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]" key={item.id}>
                          <span className="font-semibold text-slate-900">{item.action}</span> oleh {item.actorName} - {formatDate(item.createdAt)}
                          <p>{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm leading-6 text-slate-600">
              Belum ada submission yang diperiksa. Hasil akan muncul otomatis setelah mahasiswa mengunggah tugas baru.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, tone = "slate", value }: { label: string; tone?: "amber" | "emerald" | "red" | "slate"; value: number }) {
  const tones = { amber: "border-amber-200 bg-amber-50 text-amber-800", emerald: "border-emerald-200 bg-emerald-50 text-emerald-800", red: "border-red-200 bg-red-50 text-red-800", slate: "border-slate-200 bg-white text-slate-800" };
  return <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}><p className="text-sm font-semibold">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>;
}

function getStatusTone(status: keyof typeof statusLabels) {
  if (status === "flagged") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "needs_review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "passed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getDetectionMethodLabel(value: string) {
  return detectionMethodLabels[value as keyof typeof detectionMethodLabels] ?? value;
}

function OverrideForm({ action, buttonLabel, submissionId, tone }: { action: (formData: FormData) => void | Promise<void>; buttonLabel: string; submissionId: string; tone: "amber" | "red" }) {
  const isRed = tone === "red";
  return (
    <form action={action} className={`min-w-0 rounded-md border p-3 ${isRed ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <input name="submissionId" type="hidden" value={submissionId} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-800">Alasan keputusan</span>
        <textarea className="min-h-24 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" minLength={10} name="reason" required />
      </label>
      {isRed ? (
        <ConfirmSubmitButton className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 sm:w-auto" message="Tolak permanen submission ini dan tetapkan nilai 0?">
          <AlertTriangle className="size-4" />{buttonLabel}
        </ConfirmSubmitButton>
      ) : (
        <SubmitButton
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 sm:w-auto"
          pendingLabel="Membuka ulang..."
        >
          <RotateCcw className="size-4" />{buttonLabel}
        </SubmitButton>
      )}
    </form>
  );
}

function formatDate(value: Date | null) {
  return formatAppDateTime(value);
}
