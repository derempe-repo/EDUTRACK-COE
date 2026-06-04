import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Link as LinkIcon,
  Lock,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitAssignmentAction } from "@/features/assignments/actions";
import { syncCertificateEligibilityAction } from "@/features/certificates/actions";
import { canShowStudentModuleContent } from "@/features/classes/access";
import { markMaterialReadAction } from "@/features/classes/actions";
import { getCachedMahasiswaClassDetail } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import { extractIdFromSlugParam, getMahasiswaClassPath } from "@/features/classes/urls";
import { LMS_ALLOWED_FILE_DESCRIPTION, LMS_FILE_ACCEPT } from "@/features/files/lms-file-types";
import { startQuizAction } from "@/features/quizzes/actions";
import { requireRole } from "@/lib/auth";

type MahasiswaClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type NextLearningTarget = {
  href: string;
  label: string;
  moduleId: string;
  moduleTitle: string;
  stepId: string | null;
  stepTitle: string;
};

const materialTypeLabels = {
  link: "Link",
  video: "Video",
  pdf: "PDF",
  file: "File",
  slide: "Slide",
} as const;

const submissionStatusLabels = {
  accepted: "Diterima",
  draft: "Draft",
  locked: "Terkunci",
  rejected: "Ditolak",
  resubmit_allowed: "Resubmit dibuka",
  submitted: "Terkirim",
  under_review: "Direview",
} as const;

const progressStatusLabels = {
  failed: "Perlu perbaikan",
  in_progress: "Berjalan",
  locked: "Terkunci",
  not_started: "Belum mulai",
  submitted: "Menunggu review",
  verified: "Selesai",
} as const;

const quizAttemptStatusLabels = {
  expired: "Waktu habis",
  reset: "Reset exam mode",
  started: "Sedang dikerjakan",
  submitted: "Selesai",
} as const;

type DateLike = Date | string | null;

function toDate(value: DateLike) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateTimestamp(value: DateLike) {
  return toDate(value)?.getTime() ?? null;
}

function formatDateTime(value: DateLike) {
  const date = toDate(value);

  if (!date) {
    return "Tanpa tenggat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function canSubmitAgain(status: keyof typeof submissionStatusLabels | null) {
  return status === null || status === "rejected" || status === "resubmit_allowed";
}

export default async function MahasiswaClassDetailPage({
  params,
  searchParams,
}: MahasiswaClassDetailPageProps) {
  const profile = await requireRole(["mahasiswa"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const data = await getCachedMahasiswaClassDetail(profile.id, classId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getMahasiswaClassPath(data.classItem);
  if (classParam !== canonicalPath.split("/").at(-1)) {
    redirect(canonicalPath);
  }

  const nowMs = new Date().getTime();
  const stepCount = data.modules.reduce((sum, moduleItem) => sum + moduleItem.steps.length, 0);
  const materialCount = data.modules.reduce(
    (sum, moduleItem) =>
      sum +
      moduleItem.steps.reduce((stepSum, step) => stepSum + step.materials.length, 0),
    0,
  );
  const progressPercent = data.classProgress.percent;
  const nextLearningTarget = data.modules
    .filter((moduleItem) => !moduleItem.isLocked)
    .flatMap<NextLearningTarget>((moduleItem) => {
      const nextStep = moduleItem.steps.find(
        (step) =>
          step.materials.some((material) => !material.read) ||
          step.assignments.some((assignment) => assignment.submission?.status !== "accepted") ||
          step.quizzes.some(
            (quiz) =>
              quiz.attempt?.status !== "submitted" ||
              (quiz.attempt.score ?? 0) < quiz.passingScore,
          ),
      );

      if (nextStep) {
        return [
          {
            href: `#step-${nextStep.id}`,
            label: "Lanjutkan belajar",
            moduleId: moduleItem.id,
            moduleTitle: moduleItem.title,
            stepId: nextStep.id,
            stepTitle: nextStep.title,
          },
        ];
      }

      if (moduleItem.finalExam && moduleItem.completion.finalExamPassed === 0) {
        return [
          {
            href: `#final-exam-${moduleItem.id}`,
            label: "Lanjutkan ke final exam",
            moduleId: moduleItem.id,
            moduleTitle: moduleItem.title,
            stepId: null,
            stepTitle: moduleItem.finalExam.title,
          },
        ];
      }

      return [];
    })
    .at(0);
  const activeModuleId =
    nextLearningTarget?.moduleId ??
    data.modules.find(
      (moduleItem) =>
        !moduleItem.isLocked &&
        moduleItem.completion.requiredCompletionCount > 0 &&
        moduleItem.completion.percent < 100,
    )?.id ??
    data.modules.find(
      (moduleItem) => !moduleItem.isLocked && moduleItem.completion.requiredCompletionCount > 0,
    )?.id ??
    data.modules.find((moduleItem) => !moduleItem.isLocked)?.id;

  return (
    <DashboardShell profile={profile} title={data.classItem.title}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/mahasiswa/dashboard" },
              { label: data.classItem.title },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-teal-700"
            href="/mahasiswa/dashboard"
          >
            <ArrowLeft className="size-4" />
            Kembali ke dashboard
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#123044] p-5 text-white sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
                Kelas aktif
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]">
                {data.classItem.title}
              </h1>
              <p className="mt-2 text-sm font-semibold text-sky-100">
                Dosen: {data.classItem.lecturerName}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
                {data.classItem.description ?? "Belum ada deskripsi kelas."}
              </p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-teal-950">Progres kelas</p>
                    <p className="mt-1 text-xs leading-5 text-teal-800 sm:text-sm">
                      {data.classProgress.completed} dari {data.classProgress.total} aktivitas belajar
                      sudah selesai.
                    </p>
                  </div>
                  <span className="shrink-0 text-2xl font-bold text-teal-950">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 text-xs font-semibold text-teal-950 sm:grid-cols-3">
                  <span className="rounded-md border border-teal-200 bg-white px-3 py-2">
                    {data.classProgress.verified} selesai
                  </span>
                  <span className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
                    {data.classProgress.submitted} menunggu review
                  </span>
                  <span className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                    {data.classProgress.failed} perlu perbaikan
                  </span>
                </div>
                {nextLearningTarget ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-teal-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                        Berikutnya
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-teal-950">
                        {nextLearningTarget.moduleTitle} - {nextLearningTarget.stepTitle}
                      </p>
                    </div>
                    <a
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                      href={nextLearningTarget.href}
                    >
                      {nextLearningTarget.label}
                      <ArrowRight className="size-4" />
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat icon={<Layers className="size-4" />} label="Modul" value={data.modules.length} />
                <MiniStat icon={<BookOpen className="size-4" />} label="Step" value={stepCount} />
                <MiniStat icon={<FileText className="size-4" />} label="Materi" value={materialCount} />
              </div>
            </div>
          </div>

          <details
            className="group h-fit self-start overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm"
            id="certificate"
            open={
              data.certificate?.status === "issued" ||
              data.certificate?.status === "revoked" ||
              data.certificateEligibility.isEligible ||
              data.certificateEligibility.percent >= 80
            }
          >
            <summary className="cursor-pointer list-none border-b border-amber-100 bg-amber-50 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <Award className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Sertifikat kelulusan
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950">
                      {data.certificate?.status === "issued"
                        ? "Sertifikat siap diunduh"
                        : data.certificate?.status === "revoked"
                          ? "Sertifikat dicabut"
                          : data.certificateEligibility.isEligible
                            ? "Kelas sudah diselesaikan"
                            : "Masih dalam proses belajar"}
                    </h2>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-amber-800">
                  {data.certificateEligibility.percent}%
                  <ChevronDown className="size-4 transition group-open:rotate-180" />
                </span>
              </div>
            </summary>

            <div className="space-y-4 p-4 sm:p-5">
              {data.certificate ? (
                <p className="text-sm leading-6 text-slate-600">
                  {data.certificate.status === "issued"
                    ? "Selamat, sertifikat digital EduTrack COE sudah diterbitkan dan dapat diunduh."
                    : data.certificate.status === "revoked"
                      ? "Sertifikat pernah diterbitkan, tetapi saat ini telah dicabut oleh administrator."
                      : `Draft kelulusan tersimpan pada ${formatDateTime(data.certificate.eligibleAt)}. Terbitkan sertifikat saat layanan tersedia.`}
                </p>
              ) : data.certificateEligibility.isEligible ? (
                <p className="text-sm leading-6 text-slate-600">
                  Semua aktivitas wajib sudah selesai. Siapkan sertifikat digital untuk menyimpan status
                  kelulusan kelas ini.
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Selesaikan {data.certificateEligibility.missingCount} aktivitas wajib lagi untuk membuka
                  penerbitan sertifikat digital.
                </p>
              )}

              {data.certificate?.status === "issued" ? (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    Terverifikasi
                  </p>
                  <p className="mt-2 break-all text-xs font-semibold leading-5 text-emerald-950">
                    {data.certificate.certificateNumber ?? "Nomor sertifikat sedang disiapkan"}
                  </p>
                </div>
              ) : data.certificate?.status === "revoked" ? (
                <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  Hubungi administrator jika status ini perlu ditinjau ulang.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="text-slate-500">Kesiapan sertifikat</span>
                    <span className="text-amber-800">{data.certificateEligibility.percent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
                    <div
                      className="h-full rounded-full bg-amber-600"
                      style={{ width: `${data.certificateEligibility.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {data.certificate?.status === "issued" ? (
                <a
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
                  data-no-progress
                  href={`/api/certificates/${data.certificate.id}/download`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Download className="size-4" />
                  Unduh sertifikat
                </a>
              ) : data.certificateEligibility.isEligible &&
                (!data.certificate || data.certificate.status === "draft") ? (
                <form action={syncCertificateEligibilityAction}>
                  <input name="classId" type="hidden" value={data.classItem.id} />
                  <button className="inline-flex w-full items-center justify-center rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">
                    {data.certificate ? "Coba terbitkan" : "Siapkan sertifikat"}
                  </button>
                </form>
              ) : null}
            </div>
          </details>
        </section>

        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Materi belajar</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Modul pembelajaran</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Buka modul, selesaikan step secara berurutan, lalu kerjakan final exam.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500">{data.modules.length} modul</span>
          </div>

          {data.modules.length > 0 ? (
            <div className="space-y-4 sm:space-y-5">
              {data.modules.map((moduleItem) => {
              const canShowContent = canShowStudentModuleContent({
                classStatus: data.classItem.status,
                moduleIsLocked: moduleItem.isLocked,
              });
              const moduleProgressPercent = moduleItem.completion.percent;

                return (
                  <CollapsibleSection
                  defaultOpen={moduleItem.id === activeModuleId && canShowContent}
                  eyebrow={`Modul ${moduleItem.sortOrder}`}
                  key={moduleItem.id}
                  meta={
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                      {moduleItem.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          <Lock className="size-3" />
                          Terkunci
                        </span>
                      ) : null}
                      <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
                        {moduleItem.steps.length} step
                      </span>
                      <span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-teal-700">
                        Progress {moduleProgressPercent}%
                      </span>
                    </div>
                  }
                  summary={moduleItem.description ?? "Belum ada deskripsi modul."}
                  title={moduleItem.title}
                  tone="module"
                >
                  {!canShowContent ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                      {moduleItem.lockReason === "plagiarism"
                        ? "Modul ini terkunci sementara karena submission pada modul sebelumnya perlu ditinjau dosen."
                        : "Modul ini masih terkunci. Materi akan muncul setelah dosen membuka aksesnya."}
                    </div>
                  ) : moduleItem.steps.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-teal-950">Checklist penyelesaian modul</p>
                            <p className="mt-1 text-sm leading-6 text-teal-800">
                              {moduleItem.completion.completedCount} dari{" "}
                              {moduleItem.completion.requiredCompletionCount} aktivitas wajib selesai.
                            </p>
                          </div>
                          <span className="w-fit rounded-md border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                            {moduleItem.completion.readyForFinalExam ? "Final exam terbuka" : "Belum lengkap"}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <ChecklistPill
                            done={moduleItem.completion.readMaterials}
                            label="Materi dibaca"
                            total={moduleItem.completion.requiredMaterials}
                          />
                          <ChecklistPill
                            done={moduleItem.completion.acceptedAssignments}
                            label="Tugas diterima"
                            total={moduleItem.completion.requiredAssignments}
                          />
                          <ChecklistPill
                            done={moduleItem.completion.passedQuizzes}
                            label="Kuis step lulus"
                            total={moduleItem.completion.requiredQuizzes}
                          />
                          <ChecklistPill
                            done={moduleItem.completion.finalExamPassed}
                            label="Final exam lulus"
                            total={moduleItem.completion.requiredFinalExams}
                          />
                        </div>
                      </div>
                      {moduleItem.steps.map((step, stepIndex) => {
                        const isActiveStep =
                          step.id === nextLearningTarget?.stepId || (!nextLearningTarget && stepIndex === 0);
                        const hasUnreadMaterials = step.materials.some((material) => !material.read);
                        const hasPendingAssignments = step.assignments.some(
                          (assignment) => assignment.submission?.status !== "accepted",
                        );
                        const hasPendingQuizzes = step.quizzes.some(
                          (quiz) =>
                            quiz.attempt?.status !== "submitted" ||
                            (quiz.attempt.score ?? 0) < quiz.passingScore,
                        );

                        return (
                      <details
                        className="group overflow-hidden rounded-lg border border-l-4 border-slate-200 border-l-teal-500 bg-white shadow-sm"
                        id={`step-${step.id}`}
                        key={step.id}
                        open={isActiveStep}
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
                          <span className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wide text-teal-700">
                              Step {step.sortOrder}
                            </span>
                            <span className="mt-1 block font-semibold text-slate-900">{step.title}</span>
                            <span className="mt-1 block text-sm leading-6 text-slate-500">
                              {step.description ?? "Belum ada deskripsi step."}
                            </span>
                            <span className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                {step.progress?.status === "verified" ? (
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                ) : step.progress?.status === "failed" ? (
                                  <XCircle className="size-3 text-red-600" />
                                ) : (
                                  <Clock3 className="size-3 text-amber-600" />
                                )}
                                {progressStatusLabels[step.progress?.status ?? "not_started"]}
                              </span>
                              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                {step.materials.length} materi
                              </span>
                              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                                {step.assignments.length} tugas
                              </span>
                              <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                                {step.quizzes.length} kuis
                              </span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {step.isRequired ? (
                              <span className="hidden rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-xs text-teal-700 sm:inline-flex">
                                Wajib
                              </span>
                            ) : null}
                            <span className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                              <ChevronDown className="size-4 transition group-open:rotate-180" />
                            </span>
                          </span>
                        </summary>

                        <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:ml-6 sm:px-5">
                          <ActivitySection
                            count={step.materials.length}
                            defaultOpen={isActiveStep && hasUnreadMaterials}
                            description="Buka file atau tautan di bawah ini sebagai sumber belajar untuk step ini."
                            icon={<BookOpen className="size-4" />}
                            label="Materi"
                            tone="material"
                          >

                          {step.materials.length > 0 ? (
                            <div className="grid min-w-0 gap-2 sm:pl-4">
                              {step.materials.map((material) => (
                                <div
                                  className="grid gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                                  key={material.id}
                                >
                                  <a
                                    className="flex w-full min-w-0 max-w-full items-start gap-3 overflow-hidden transition hover:text-sky-800 sm:items-center"
                                    href={
                                      material.storagePath
                                        ? `/api/materials/${material.id}/signed-url`
                                        : (material.url ?? "#")
                                    }
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {material.storagePath ? (
                                      <FileText className="mt-0.5 size-4 shrink-0 text-sky-700 sm:mt-0" />
                                    ) : (
                                      <LinkIcon className="mt-0.5 size-4 shrink-0 text-sky-700 sm:mt-0" />
                                    )}
                                    <span className="min-w-0 flex-1 overflow-hidden">
                                      <span className="block max-w-full break-words font-semibold text-sky-950 [overflow-wrap:anywhere]">
                                        {material.title}
                                      </span>
                                      <span className="mt-1 inline-flex w-fit rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs uppercase text-sky-700">
                                        {materialTypeLabels[material.type]}
                                      </span>
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-700">
                                      Buka
                                      <ExternalLink className="size-4" />
                                    </span>
                                  </a>
                                  {material.read ? (
                                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 sm:w-fit">
                                      <CheckCircle2 className="size-4" />
                                      Selesai
                                    </span>
                                  ) : (
                                    <form action={markMaterialReadAction}>
                                      <input name="materialId" type="hidden" value={material.id} />
                                      <SubmitButton
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 sm:w-fit"
                                        pendingLabel="Menandai..."
                                      >
                                        <CheckCircle2 className="size-4" />
                                        Tandai selesai
                                      </SubmitButton>
                                    </form>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                              Belum ada materi untuk step ini.
                            </p>
                          )}
                          </ActivitySection>

                          <ActivitySection
                            count={step.assignments.length}
                            defaultOpen={isActiveStep && !hasUnreadMaterials && hasPendingAssignments}
                            description="Kumpulkan laporan atau source code sesuai instruksi dosen."
                            icon={<ClipboardList className="size-4" />}
                            label="Tugas"
                            tone="assignment"
                          >

                          {step.assignments.length > 0 ? (
                            <div className="grid gap-3 sm:pl-4">
                              {step.assignments.map((assignment) => {
                                const submission = assignment.submission;
                                const isSubmittable = canSubmitAgain(submission?.status ?? null);
                                const dueAtMs = dateTimestamp(assignment.dueAt);
                                const isPastDue = dueAtMs !== null ? dueAtMs < nowMs : false;
                                const canUploadNow =
                                  isSubmittable &&
                                  (!isPastDue || submission?.status === "resubmit_allowed");

                                return (
                                  <article
                                    className="rounded-lg border border-indigo-200 bg-white p-4 shadow-sm"
                                    key={assignment.id}
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h5 className="font-semibold text-neutral-950">{assignment.title}</h5>
                                          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                                            Maks {assignment.maxScore}
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
                                      {submission ? (
                                        <span className="w-fit rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                                          {submissionStatusLabels[submission.status]}
                                        </span>
                                      ) : isPastDue ? (
                                        <span className="w-fit rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                                          Tenggat lewat
                                        </span>
                                      ) : null}
                                    </div>

                                    {submission ? (
                                      <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
                                        <a
                                          className="inline-flex max-w-full items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 font-semibold transition hover:border-sky-300 hover:bg-sky-100"
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
                                          Dikirim: {formatDateTime(submission.submittedAt)}
                                        </p>
                                        {submission.score !== null ? (
                                          <p className="mt-2 font-semibold">Nilai: {submission.score}</p>
                                        ) : null}
                                        {submission.feedback ? (
                                          <p className="mt-2 leading-6">Feedback: {submission.feedback}</p>
                                        ) : null}
                                        {submission.plagiarismStatus === "flagged" ? (
                                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-red-900">
                                            <p className="inline-flex items-center gap-2 font-semibold">
                                              <AlertTriangle className="size-4 shrink-0" />
                                              Submission dikunci sementara
                                            </p>
                                            <p className="mt-1 text-xs leading-5">
                                              Sistem menemukan kemiripan yang perlu ditinjau dosen. Anda belum dapat mengunggah ulang atau melanjutkan modul berikutnya.
                                            </p>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {canUploadNow ? (
                                      <details className="group mt-4 rounded-md border border-indigo-200 bg-indigo-50/70">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-indigo-900 [&::-webkit-details-marker]:hidden">
                                          <span className="inline-flex items-center gap-2">
                                            <Upload className="size-4 text-indigo-700" />
                                            Kumpulkan tugas
                                          </span>
                                          <ChevronDown className="size-4 text-indigo-700 transition group-open:rotate-180" />
                                        </summary>
                                        <form
                                          action={submitAssignmentAction}
                                          className="grid gap-3 border-t border-indigo-200 bg-white p-3"
                                        >
                                          <input name="assignmentId" type="hidden" value={assignment.id} />
                                          <label className="block space-y-2">
                                            <span className="text-sm font-medium text-neutral-700">
                                              File submission
                                            </span>
                                            <input
                                              accept={LMS_FILE_ACCEPT}
                                              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                                              name="file"
                                              required
                                              type="file"
                                            />
                                            <span className="block text-xs leading-5 text-neutral-500">
                                              {LMS_ALLOWED_FILE_DESCRIPTION} Maksimal 4 MB.
                                            </span>
                                          </label>
                                          <label className="block space-y-2">
                                            <span className="text-sm font-medium text-neutral-700">
                                              Catatan
                                            </span>
                                            <textarea
                                              className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                                              name="note"
                                              placeholder="Catatan singkat untuk dosen."
                                            />
                                          </label>
                                          <SubmitButton
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                                            pendingLabel="Mengirim..."
                                          >
                                            <Upload className="size-4" />
                                            Kirim submission
                                          </SubmitButton>
                                        </form>
                                      </details>
                                    ) : (
                                      <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                                        {isPastDue && !submission
                                          ? "Tenggat sudah lewat. Hubungi dosen jika perlu membuka pengumpulan ulang."
                                          : "Submission sedang menunggu review atau sudah diterima."}
                                      </p>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                              Belum ada tugas untuk step ini.
                            </p>
                          )}
                          </ActivitySection>

                          <ActivitySection
                            count={step.quizzes.length}
                            defaultOpen={
                              isActiveStep &&
                              !hasUnreadMaterials &&
                              !hasPendingAssignments &&
                              hasPendingQuizzes
                            }
                            description="Kerjakan kuis untuk mendapatkan nilai otomatis. Saat mulai, soal akan diacak dan exam mode akan aktif."
                            icon={<ClipboardList className="size-4" />}
                            label="Kuis"
                            tone="quiz"
                          >

                          {step.quizzes.length > 0 ? (
                            <div className="grid gap-3 sm:pl-4">
                              {step.quizzes.map((quiz) => {
                                const attempt = quiz.attempt;
                                const attemptExpiresAtMs = dateTimestamp(attempt?.expiresAt ?? null);
                                const canContinue =
                                  attempt?.status === "started" &&
                                  attemptExpiresAtMs !== null &&
                                  attemptExpiresAtMs > nowMs;

                                return (
                                  <article
                                    className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm"
                                    key={quiz.id}
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <ClipboardList className="size-4 text-violet-700" />
                                          <h5 className="font-semibold text-neutral-950">{quiz.title}</h5>
                                          <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-700">
                                            {quiz.questionCount} soal
                                          </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                                          {quiz.description ?? "Belum ada deskripsi kuis."}
                                        </p>
                                        <p className="mt-2 text-xs font-medium text-neutral-500">
                                          Durasi {quiz.durationMinutes} menit - Nilai lulus {quiz.passingScore}
                                        </p>
                                      </div>
                                      {attempt ? (
                                        <span className="w-fit rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                                          {quizAttemptStatusLabels[attempt.status]}
                                          {attempt.score !== null ? ` - ${attempt.score}` : ""}
                                        </span>
                                      ) : null}
                                    </div>

                                    {attempt ? (
                                      <div className="mt-4 rounded-md border border-violet-200 bg-violet-50 px-3 py-3 text-sm text-violet-950">
                                        <p className="font-semibold">
                                          {attempt.status === "submitted"
                                            ? `Nilai akhir: ${attempt.score ?? 0}`
                                            : quizAttemptStatusLabels[attempt.status]}
                                        </p>
                                        <p className="mt-1 text-xs text-violet-700">
                                          Mulai {formatDateTime(attempt.startedAt)}
                                          {attempt.submittedAt
                                            ? ` - Submit ${formatDateTime(attempt.submittedAt)}`
                                            : ""}
                                          {attempt.warningCount > 0
                                            ? ` - Warning ${attempt.warningCount}/3`
                                            : ""}
                                        </p>
                                      </div>
                                    ) : null}

                                    {attempt?.status === "submitted" || canContinue ? (
                                      <Link
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                                        href={`/mahasiswa/quizzes/attempts/${attempt.id}`}
                                      >
                                        {canContinue ? "Lanjutkan kuis" : "Lihat hasil"}
                                      </Link>
                                    ) : (
                                      <form action={startQuizAction} className="mt-4">
                                        <input name="quizId" type="hidden" value={quiz.id} />
                                        <SubmitButton
                                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                                          pendingLabel="Menyiapkan kuis..."
                                        >
                                          {attempt?.status === "reset" || attempt?.status === "expired"
                                            ? "Mulai ulang kuis"
                                            : "Mulai kuis"}
                                        </SubmitButton>
                                      </form>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                              Belum ada kuis untuk step ini.
                            </p>
                          )}
                          </ActivitySection>
                        </div>
                      </details>
                        );
                      })}
                      {moduleItem.finalExam ? (
                        <div id={`final-exam-${moduleItem.id}`}>
                          <FinalExamCard
                            canStart={moduleItem.completion.readyForFinalExam}
                            nowMs={nowMs}
                            quiz={moduleItem.finalExam}
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-600">
                          Final exam modul belum tersedia.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-neutral-600">Belum ada step untuk modul ini.</p>
                  )}
                  </CollapsibleSection>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
              Belum ada modul untuk kelas ini.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mx-auto flex w-fit rounded-md bg-teal-50 p-2 text-teal-700">{icon}</div>
      <p className="mt-2 text-lg font-bold text-[#123044]">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

const activityHeadingStyles = {
  assignment: {
    root: "border-indigo-200 bg-indigo-50 text-indigo-950",
    icon: "bg-white text-indigo-700",
    badge: "border-indigo-200 bg-white text-indigo-700",
  },
  material: {
    root: "border-amber-300 bg-amber-100 text-amber-950",
    icon: "bg-white text-amber-800",
    badge: "border-amber-300 bg-white text-amber-800",
  },
  quiz: {
    root: "border-violet-200 bg-violet-50 text-violet-950",
    icon: "bg-white text-violet-700",
    badge: "border-violet-200 bg-white text-violet-700",
  },
} as const;

function ActivitySection({
  children,
  count,
  defaultOpen = false,
  description,
  icon,
  label,
  tone,
}: {
  children: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  description: string;
  icon: React.ReactNode;
  label: string;
  tone: keyof typeof activityHeadingStyles;
}) {
  const styles = activityHeadingStyles[tone];

  return (
    <details className={`group overflow-hidden rounded-lg border ${styles.root}`} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md ${styles.icon}`}>
              {icon}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles.badge}`}>
              {count} item
            </span>
          </span>
          <span className="mt-2 block text-sm leading-6 opacity-85">{description}</span>
        </span>
        <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md ${styles.icon}`}>
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-3 border-t border-current/10 bg-white/70 px-3 py-3 sm:px-4">
        {children}
      </div>
    </details>
  );
}

function ChecklistPill({
  done,
  label,
  total,
}: {
  done: number;
  label: string;
  total: number;
}) {
  const isDone = total > 0 && done >= total;

  return (
    <div className="rounded-md border border-teal-100 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-teal-900">{label}</span>
        {isDone ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <Clock3 className="size-4 text-amber-600" />
        )}
      </div>
      <p className="mt-1 text-xs text-teal-700">
        {total === 0 ? "Belum ada" : `${done}/${total} selesai`}
      </p>
    </div>
  );
}

function FinalExamCard({
  canStart,
  nowMs,
  quiz,
}: {
  canStart: boolean;
  nowMs: number;
  quiz: NonNullable<NonNullable<Awaited<ReturnType<typeof getCachedMahasiswaClassDetail>>>["modules"][number]["finalExam"]>;
}) {
  const attempt = quiz.attempt;
  const attemptExpiresAtMs = dateTimestamp(attempt?.expiresAt ?? null);
  const canContinue =
    attempt?.status === "started" &&
    attemptExpiresAtMs !== null &&
    attemptExpiresAtMs > nowMs;
  const canRetake = attempt?.status === "reset" || attempt?.status === "expired";

  return (
    <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="size-4 text-emerald-700" />
            <h4 className="font-semibold text-emerald-950">{quiz.title}</h4>
            <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-700">
              {quiz.questionCount} soal
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            {quiz.description ?? "Final exam modul ini memakai bank soal dari seluruh step."}
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-800">
            Durasi {quiz.durationMinutes} menit - Nilai lulus {quiz.passingScore}
          </p>
        </div>
        {attempt ? (
          <span className="w-fit rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
            {quizAttemptStatusLabels[attempt.status]}
            {attempt.score !== null ? ` - ${attempt.score}` : ""}
          </span>
        ) : null}
      </div>

      {attempt ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-white px-3 py-3 text-sm text-emerald-950">
          <p className="font-semibold">
            {attempt.status === "submitted"
              ? `Nilai final exam: ${attempt.score ?? 0}`
              : quizAttemptStatusLabels[attempt.status]}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Mulai {formatDateTime(attempt.startedAt)}
            {attempt.submittedAt ? ` - Submit ${formatDateTime(attempt.submittedAt)}` : ""}
            {attempt.warningCount > 0 ? ` - Warning ${attempt.warningCount}/3` : ""}
          </p>
        </div>
      ) : null}

      {!canStart ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selesaikan tugas dan kuis step terlebih dahulu untuk membuka final exam.
        </p>
      ) : attempt?.status === "submitted" || canContinue ? (
        <Link
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
          href={`/mahasiswa/quizzes/attempts/${attempt.id}`}
        >
          {canContinue ? "Lanjutkan final exam" : "Lihat hasil"}
        </Link>
      ) : (
        <form action={startQuizAction} className="mt-4">
          <input name="quizId" type="hidden" value={quiz.id} />
          <SubmitButton
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
            pendingLabel="Menyiapkan exam..."
          >
            {canRetake ? "Mulai ulang final exam" : "Mulai final exam"}
          </SubmitButton>
        </form>
      )}
    </article>
  );
}
