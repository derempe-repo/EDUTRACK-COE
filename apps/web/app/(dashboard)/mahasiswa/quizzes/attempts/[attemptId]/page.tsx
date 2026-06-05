import { ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { getMahasiswaClassPath } from "@/features/classes/urls";
import { CountdownTimer } from "@/features/quizzes/countdown-timer";
import { getQuizAttemptDetail } from "@/features/quizzes/data";
import { ExamModeGuard } from "@/features/quizzes/exam-mode-guard";
import { QuizAttemptForm } from "@/features/quizzes/quiz-attempt-form";
import { formatAppDateTime } from "@/lib/app-time";
import { requireRole } from "@/lib/auth";

type QuizAttemptPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const attemptStatusLabels = {
  expired: "Waktu habis",
  reset: "Reset exam mode",
  started: "Sedang dikerjakan",
  submitted: "Selesai",
} as const;

export default async function QuizAttemptPage({ params, searchParams }: QuizAttemptPageProps) {
  const profile = await requireRole(["mahasiswa"]);
  const { attemptId } = await params;
  const data = await getQuizAttemptDetail(profile.id, attemptId);
  const submitted = Boolean((await searchParams)?.submitted);

  if (!data) {
    notFound();
  }

  const classPath = getMahasiswaClassPath(data.classItem);
  const nowMs = new Date().getTime();
  const isStarted = data.attempt.status === "started" && data.attempt.expiresAt.getTime() > nowMs;
  const showResult = data.attempt.status === "submitted";
  const quizTypeLabel = data.quiz.quizType === "final" ? "Final exam modul" : "Kuis step";

  return (
    <DashboardShell profile={profile} title={data.quiz.title}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/mahasiswa/dashboard" },
              { label: data.classItem.title, href: classPath },
              { label: `Modul-${data.moduleItem.title}` },
              ...(data.step ? [{ label: `Step-${data.step.title}` }] : []),
              { label: data.quiz.quizType === "final" ? "Final Exam" : "Kuis" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
            href={classPath}
          >
            <ArrowLeft className="size-4" />
            Kembali ke {data.classItem.title}
          </Link>
        </div>

        {submitted ? (
          <DismissibleAlert title="Kuis dikumpulkan" tone="success">
            Jawaban sudah dinilai otomatis dan nilai Anda sudah tersimpan.
          </DismissibleAlert>
        ) : null}

        <section className="grid gap-3 rounded-lg bg-[#123044] p-3 text-white shadow-sm sm:p-4 xl:sticky xl:top-[76px] xl:z-20 xl:grid-cols-[minmax(0,1fr)_500px] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#e7b75b]">
                {quizTypeLabel}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-sky-50">
                <span
                  className={
                    data.attempt.status === "submitted"
                      ? "size-2 shrink-0 rounded-full bg-emerald-400"
                      : data.attempt.status === "started"
                        ? "size-2 shrink-0 rounded-full bg-teal-400"
                        : "size-2 shrink-0 rounded-full bg-amber-400"
                  }
                />
                {attemptStatusLabels[data.attempt.status]}
              </span>
            </div>
            <h1 className="mt-1.5 truncate text-xl font-bold leading-tight">{data.quiz.title}</h1>
            <p className="mt-1 truncate text-xs text-sky-100/75">
              {data.moduleItem.title}
              {data.step ? ` - ${data.step.title}` : " - Final Exam"}
            </p>
            <div className="mt-2 text-xs text-sky-100/70 xl:hidden">
              {showResult
                ? `Dikumpulkan ${formatAppDateTime(data.attempt.submittedAt)}`
                : `Dimulai ${formatAppDateTime(data.attempt.startedAt)}`}
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
            <MiniStat
              emphasis
              label="Sisa waktu"
              value={
                isStarted ? (
                  <CountdownTimer
                    attemptId={data.attempt.id}
                    expiresAtMs={data.attempt.expiresAt.getTime()}
                    initialRemainingMs={data.attempt.expiresAt.getTime() - nowMs}
                  />
                ) : (
                  "-"
                )
              }
            />
            <MiniStat label="Warning exam mode" value={`${data.attempt.warningCount}/3`} />
            <MiniStat label="Jumlah soal" value={`${data.questions.length} soal`} />
            <MiniStat label="Nilai lulus" value={data.quiz.passingScore} />
          </div>
        </section>

        {showResult ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Hasil penilaian otomatis
                </p>
                <h2 className="mt-1 text-lg font-semibold text-emerald-950">Jawaban sudah diperiksa</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  Benar {data.attempt.correctWeight} dari {data.attempt.totalWeight} bobot soal.
                </p>
              </div>
              <span className="text-3xl font-bold text-emerald-950">{data.attempt.score ?? 0}</span>
            </div>
          </section>
        ) : null}

        {isStarted ? (
          <ExamModeGuard attemptId={data.attempt.id}>
            <QuizAttemptForm
              attemptId={data.attempt.id}
              questions={data.questions.map((question) => ({
                id: question.id,
                options: question.options.map((option) => ({
                  id: option.id,
                  label: option.label,
                  optionText: option.optionText,
                })),
                questionText: question.questionText,
                weight: question.weight,
              }))}
            />
          </ExamModeGuard>
        ) : (
          <QuizReview questions={data.questions} showResult={showResult} />
        )}
      </div>
    </DashboardShell>
  );
}

function QuizReview({
  questions,
  showResult,
}: {
  questions: NonNullable<Awaited<ReturnType<typeof getQuizAttemptDetail>>>["questions"];
  showResult: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Pembahasan jawaban</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          {showResult ? "Periksa hasil pengerjaan" : "Daftar soal"}
        </h2>
      </div>
      {questions.map((question, index) => (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" key={question.id}>
          <div className="flex items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-sm font-bold text-teal-700">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-6 text-slate-950">{question.questionText}</p>
              <p className="mt-1 text-xs text-slate-400">Bobot {question.weight}</p>
              <div className="mt-4 grid gap-2">
                {question.options.map((option) => {
                  const isSelected = question.answer?.selectedOptionId === option.id;
                  const isCorrect = showResult && option.isCorrect;

                  return (
                    <div
                      className={
                        isCorrect
                          ? "flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950"
                          : isSelected
                            ? "flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950"
                            : "flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                      }
                      key={option.id}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      ) : isSelected ? (
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <Clock3 className="mt-0.5 size-4 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="font-semibold">{option.label}.</span>{" "}
                        <span className="break-words [overflow-wrap:anywhere]">{option.optionText}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function MiniStat({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className={
        emphasis
          ? "min-w-0 rounded-lg border border-cyan-300/40 bg-cyan-700 p-2.5 [&_span]:text-white"
          : "min-w-0 rounded-lg border border-white/15 bg-white/10 p-2.5"
      }
    >
      <p className="text-[11px] leading-4 text-sky-100/80">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}
