import { ArrowLeft, ClipboardList, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getCachedDosenQuizAttemptsDetail } from "@/features/classes/cached-data";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenModulePath,
  getDosenModuleQuizzesPath,
  getDosenQuizAttemptsPath,
} from "@/features/classes/urls";
import { resetQuizAttemptAction } from "@/features/quizzes/actions";
import { requireRole } from "@/lib/auth";

type DosenQuizAttemptsPageProps = {
  params: Promise<{
    classId: string;
    moduleId: string;
    quizId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const quizAttemptStatusLabels = {
  expired: "Expired",
  reset: "Reset",
  started: "Sedang dikerjakan",
  submitted: "Selesai",
} as const;

export default async function DosenQuizAttemptsPage({
  params,
  searchParams,
}: DosenQuizAttemptsPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam, moduleId: moduleParam, quizId: quizParam } = await params;
  const resolvedSearchParams = await searchParams;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const quizId = extractIdFromSlugParam(quizParam);
  const data = await getCachedDosenQuizAttemptsDetail(profile.id, classId, moduleId, quizId, {
    page: parsePage(getSingleParam(resolvedSearchParams?.page)),
  });

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenQuizAttemptsPath(data.classItem, data.moduleItem, data.quizItem);
  if (`/dosen/classes/${classParam}/modules/${moduleParam}/quizzes/${quizParam}/attempts` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const isFinalExam = data.quizItem.quizType === "final";

  return (
    <DashboardShell profile={profile} title={`Attempt - ${data.quizItem.title}`}>
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
                label: "Kuis dan Bank Soal",
                href: getDosenModuleQuizzesPath(data.classItem, data.moduleItem),
              },
              { label: "Attempt" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            href={getDosenModuleQuizzesPath(data.classItem, data.moduleItem)}
          >
            <ArrowLeft className="size-4" />
            Kembali ke kuis
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-[#123044] p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
                {isFinalExam
                  ? "Final Exam Modul"
                  : data.stepItem
                    ? `Step ${data.stepItem.sortOrder} - ${data.stepItem.title}`
                    : "Kuis"}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">{data.quizItem.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
                Pantau attempt mahasiswa, nilai, status pengerjaan, warning exam mode, dan buka retake
                jika diperlukan.
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-center">
              <p className="text-2xl font-bold text-white">{data.pagination.totalItems}</p>
              <p className="text-xs font-semibold text-sky-100/75">Attempt</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-violet-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-violet-100 bg-violet-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-950">
              <ClipboardList className="size-4 text-violet-700" />
              Daftar attempt
            </p>
            <p className="text-xs text-violet-700">
              {data.pagination.pageSize} data per halaman, terbaru lebih dulu
            </p>
          </div>
          {data.attempts.length > 0 ? (
            <div className="divide-y divide-violet-100">
              {data.attempts.map((attempt) => (
                <AttemptCard attempt={attempt} key={attempt.id} />
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-600">Belum ada attempt untuk kuis ini.</p>
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

function AttemptCard({
  attempt,
}: {
  attempt: NonNullable<Awaited<ReturnType<typeof getCachedDosenQuizAttemptsDetail>>>["attempts"][number];
}) {
  return (
    <article className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-950">{attempt.studentName}</p>
          <p className="break-words text-xs text-neutral-500 [overflow-wrap:anywhere]">
            {attempt.studentEmail}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Mulai {formatDateTime(attempt.startedAt)}
            {attempt.submittedAt ? ` - Submit ${formatDateTime(attempt.submittedAt)}` : ""}
            {attempt.warningCount > 0 ? ` - Warning ${attempt.warningCount}/3` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="w-fit rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
            {quizAttemptStatusLabels[attempt.status]}
            {attempt.score !== null ? ` - Nilai ${attempt.score}` : ""}
          </span>
          {attempt.status === "submitted" || attempt.status === "reset" || attempt.status === "expired" ? (
            <form action={resetQuizAttemptAction}>
              <input name="attemptId" type="hidden" value={attempt.id} />
              <ConfirmSubmitButton
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                message="Buka kesempatan ulang untuk mahasiswa ini?"
                title="Buka retake"
              >
                <RotateCcw className="size-3" />
                Retake
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
      {attempt.events.length > 0 ? (
        <details className="mt-3 rounded-md border border-amber-200 bg-amber-50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-900 [&::-webkit-details-marker]:hidden">
            <ShieldAlert className="size-4" />
            {attempt.events.length} aktivitas exam mode
          </summary>
          <div className="grid gap-1 border-t border-amber-200 px-3 py-2">
            {attempt.events.slice(0, 8).map((event) => (
              <p className="text-xs leading-5 text-amber-900" key={event.id}>
                <span className="font-semibold">{event.eventType}</span> -{" "}
                {formatDateTime(event.createdAt)}
                {event.detail ? ` - ${event.detail}` : ""}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </article>
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
