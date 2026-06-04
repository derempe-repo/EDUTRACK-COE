import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  ListChecks,
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
import { getCachedDosenModuleDetail } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenModulePath,
  getDosenModuleQuizzesPath,
  getDosenQuizAttemptsPath,
} from "@/features/classes/urls";
import {
  createFinalExamAction,
  createQuestionAction,
  createQuizAction,
  deleteQuestionAction,
  updateQuizAction,
} from "@/features/quizzes/actions";
import { QuestionImportPanel } from "@/features/quizzes/question-import-panel";
import { requireRole } from "@/lib/auth";

type DosenModuleQuizzesPageProps = {
  params: Promise<{
    classId: string;
    moduleId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenModuleQuizzesPage({
  params,
  searchParams,
}: DosenModuleQuizzesPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam, moduleId: moduleParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const resolvedSearchParams = await searchParams;
  const data = await getCachedDosenModuleDetail(profile.id, classId, moduleId);
  const feedback = getFeedbackNotice(resolvedSearchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenModuleQuizzesPath(data.classItem, data.moduleItem);
  if (`/dosen/classes/${classParam}/modules/${moduleParam}/quizzes` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const finalExam = data.moduleItem.finalExam;
  const quizCount =
    data.moduleItem.steps.reduce((sum, step) => sum + step.quizzes.length, 0) +
    (finalExam ? 1 : 0);
  const questionCount = data.moduleItem.steps.reduce((sum, step) => sum + step.questions.length, 0);
  const attemptCount = data.moduleItem.totalAttemptCount;

  return (
    <DashboardShell profile={profile} title={`Kuis - ${data.moduleItem.title}`}>
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
              { label: "Kuis dan Bank Soal" },
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
              <h1 className="mt-2 text-2xl font-bold leading-tight">Kuis dan Bank Soal</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
                Kelola kuis, attempt mahasiswa, dan bank soal pilihan ganda per step. Soal akan
                diacak ketika mahasiswa mulai kuis.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
              <MiniStat label="Kuis" value={quizCount} />
              <MiniStat label="Soal" value={questionCount} />
              <MiniStat label="Attempt" value={attemptCount} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Final Exam Modul</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
                Final exam memakai bank soal aktif dari semua step di modul ini. Mahasiswa baru
                bisa mulai setelah tugas diterima dan kuis step lulus.
              </p>
            </div>
            <span className="w-fit rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
              {finalExam ? "Aktif" : "Belum dibuat"}
            </span>
          </div>

          {finalExam ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
              <article className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-emerald-950">{finalExam.title}</h2>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                    {finalExam.questionCount} soal
                  </span>
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
                    Lulus {finalExam.passingScore}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {finalExam.description ?? "Belum ada deskripsi final exam."}
                </p>
                <details className="group mt-4 rounded-md border border-emerald-200 bg-emerald-50/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <Settings className="size-4 text-emerald-700" />
                      Pengaturan final exam
                    </span>
                    <ChevronDown className="size-4 text-emerald-700 transition group-open:rotate-180" />
                  </summary>
                  <form action={updateQuizAction} className="grid gap-3 border-t border-emerald-200 bg-white p-3">
                    <input name="quizId" type="hidden" value={finalExam.id} />
                    <Field defaultValue={finalExam.title} label="Nama final exam" name="title" required />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field defaultValue={finalExam.durationMinutes.toString()} label="Menit" name="durationMinutes" type="number" />
                      <Field defaultValue={finalExam.questionCount.toString()} label="Soal" name="questionCount" type="number" />
                      <Field defaultValue={finalExam.passingScore.toString()} label="Lulus" name="passingScore" type="number" />
                      <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                        <input defaultChecked={finalExam.isActive} name="isActive" type="checkbox" />
                        Aktif
                      </label>
                    </div>
                    <TextArea defaultValue={finalExam.description ?? ""} label="Deskripsi final exam" name="description" />
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                      type="submit"
                    >
                      <Save className="size-4" />
                      Simpan final exam
                    </button>
                  </form>
                </details>
              </article>
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <p className="text-sm font-semibold text-emerald-950">Attempt final exam</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{finalExam.attemptCount}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Buka halaman khusus untuk melihat detail attempt dan aktivitas exam mode.
                </p>
                <Link
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  href={getDosenQuizAttemptsPath(data.classItem, data.moduleItem, finalExam)}
                >
                  Lihat attempt
                </Link>
              </div>
            </div>
          ) : (
            <details className="group mt-4 rounded-md border border-emerald-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4 text-emerald-700" />
                  Buat final exam
                </span>
                <ChevronDown className="size-4 text-emerald-700 transition group-open:rotate-180" />
              </summary>
              <form action={createFinalExamAction} className="grid gap-3 border-t border-emerald-200 p-4">
                <input name="moduleId" type="hidden" value={data.moduleItem.id} />
                <Field label="Nama final exam" name="title" placeholder="Final Exam Pengenalan HTML dan CSS" required />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field defaultValue="60" label="Menit" name="durationMinutes" type="number" />
                  <Field defaultValue="10" label="Soal" name="questionCount" type="number" />
                  <Field defaultValue="75" label="Lulus" name="passingScore" type="number" />
                  <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                    <input defaultChecked name="isActive" type="checkbox" />
                    Aktif
                  </label>
                </div>
                <TextArea label="Deskripsi final exam" name="description" />
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                  type="submit"
                >
                  <Plus className="size-4" />
                  Buat final exam
                </button>
              </form>
            </details>
          )}
        </section>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                Struktur evaluasi
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Kuis per step</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Buka step untuk mengelola kuis dan bank soal. Editor hanya muncul saat dibutuhkan.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              {data.moduleItem.steps.length} step
            </span>
          </div>
          {data.moduleItem.steps.length > 0 ? (
            data.moduleItem.steps.map((step, index) => (
              <CollapsibleSection
                defaultOpen={index === 0}
                eyebrow={`Step ${step.sortOrder}`}
                key={step.id}
                meta={
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">
                      {step.quizzes.length} kuis
                    </span>
                    <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                      {step.questions.length} soal
                    </span>
                  </div>
                }
                summary={step.description ?? "Belum ada deskripsi step."}
                title={step.title}
                tone="step"
              >
                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <section className="space-y-3 rounded-lg border border-violet-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-violet-950">
                          Kuis Utama
                        </p>
                        <p className="mt-1 text-xs text-violet-800">
                          Setiap step hanya memiliki satu kuis agar bank soal tidak tercampur.
                        </p>
                      </div>
                      <ClipboardList className="size-5 text-violet-700" />
                    </div>

                    {step.quizzes[0] ? (
                      <div className="space-y-3">
                        {step.quizzes.slice(0, 1).map((quiz) => (
                          <article className="rounded-lg border border-violet-100 bg-violet-50 p-3" key={quiz.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-violet-950">{quiz.title}</h3>
                              <span className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs text-violet-700">
                                {quiz.questionCount} soal
                              </span>
                              <span className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600">
                                {quiz.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-violet-900">
                              {quiz.description ?? "Belum ada deskripsi kuis."}
                            </p>
                            <p className="mt-2 text-xs text-violet-700">
                              Durasi {quiz.durationMinutes} menit - Lulus {quiz.passingScore}
                            </p>

                            <details className="group mt-3 rounded-md border border-violet-200 bg-white">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-violet-900 [&::-webkit-details-marker]:hidden">
                                <span className="inline-flex items-center gap-2">
                                  <Settings className="size-4 text-violet-700" />
                                  Pengaturan kuis
                                </span>
                                <ChevronDown className="size-4 text-violet-700 transition group-open:rotate-180" />
                              </summary>
                              <div className="space-y-3 border-t border-violet-100 p-3">
                                <form
                                  action={updateQuizAction}
                                  className="grid gap-3"
                                >
                                  <input name="quizId" type="hidden" value={quiz.id} />
                                  <Field defaultValue={quiz.title} label="Nama kuis" name="title" required />
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <Field
                                      defaultValue={quiz.durationMinutes.toString()}
                                      label="Menit"
                                      name="durationMinutes"
                                      type="number"
                                    />
                                    <Field
                                      defaultValue={quiz.questionCount.toString()}
                                      label="Soal"
                                      name="questionCount"
                                      type="number"
                                    />
                                    <Field
                                      defaultValue={quiz.passingScore.toString()}
                                      label="Lulus"
                                      name="passingScore"
                                      type="number"
                                    />
                                    <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                                      <input defaultChecked={quiz.isActive} name="isActive" type="checkbox" />
                                      Aktif
                                    </label>
                                  </div>
                                  <TextArea
                                    defaultValue={quiz.description ?? ""}
                                    label="Deskripsi kuis"
                                    name="description"
                                  />
                                  <button
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                                    type="submit"
                                  >
                                    <Save className="size-4" />
                                    Simpan
                                  </button>
                                </form>

                              </div>
                            </details>

                            <div className="mt-3 flex flex-col gap-3 rounded-md border border-violet-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-violet-950">
                                  {quiz.attemptCount} attempt mahasiswa
                                </p>
                                <p className="mt-1 text-xs leading-5 text-violet-800">
                                  Detail attempt dan warning exam mode tersedia di halaman khusus.
                                </p>
                              </div>
                              <Link
                                className="inline-flex w-full items-center justify-center rounded-md bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-fit"
                                href={getDosenQuizAttemptsPath(data.classItem, data.moduleItem, quiz)}
                              >
                                Lihat attempt
                              </Link>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                        Belum ada kuis untuk step ini.
                      </p>
                    )}

                    {step.quizzes[0] ? (
                      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
                        Kuis utama untuk step ini sudah dibuat. Gunakan form edit di atas untuk
                        mengubah durasi, jumlah soal, atau status aktif.
                      </div>
                    ) : (
                      <form
                        action={createQuizAction}
                        className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4"
                      >
                        <input name="stepId" type="hidden" value={step.id} />
                        <Field label="Nama kuis" name="title" placeholder="Kuis dasar HTML" required />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field defaultValue="30" label="Menit" name="durationMinutes" type="number" />
                          <Field defaultValue="5" label="Soal" name="questionCount" type="number" />
                          <Field defaultValue="70" label="Lulus" name="passingScore" type="number" />
                          <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                            <input defaultChecked name="isActive" type="checkbox" />
                            Aktif
                          </label>
                        </div>
                        <TextArea label="Deskripsi kuis" name="description" />
                        <button
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                          type="submit"
                        >
                          <Plus className="size-4" />
                          Buat kuis
                        </button>
                      </form>
                    )}
                  </section>

                  <section className="space-y-3 rounded-lg border border-rose-200 bg-white p-4 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-rose-950">
                        Bank Soal ({step.questions.length})
                      </p>
                      <p className="mt-1 text-xs text-rose-800">
                        Bank soal ini digunakan oleh kuis utama pada step ini.
                      </p>
                    </div>

                    <QuestionImportPanel stepId={step.id} />

                    {step.questions.length > 0 ? (
                      <details className="group rounded-md border border-rose-200 bg-rose-50/60">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-rose-950 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            <ListChecks className="size-4 text-rose-700" />
                            Lihat daftar soal ({step.questions.length})
                          </span>
                          <ChevronDown className="size-4 text-rose-700 transition group-open:rotate-180" />
                        </summary>
                        <div className="space-y-3 border-t border-rose-200 p-3">
                          {step.questions.map((question) => (
                            <article className="rounded-lg border border-rose-100 bg-rose-50 p-3" key={question.id}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-rose-700">
                                      {question.difficulty}
                                    </span>
                                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600">
                                      Bobot {question.weight}
                                    </span>
                                    {!question.isActive ? (
                                      <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
                                        Nonaktif
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-sm font-semibold leading-6 text-rose-950">
                                    {question.questionText}
                                  </p>
                                  <div className="mt-2 grid gap-1">
                                    {question.options.map((option) => (
                                      <p
                                        className={
                                          option.isCorrect
                                            ? "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                                            : "rounded-md border border-white bg-white px-2 py-1 text-xs text-neutral-700"
                                        }
                                        key={option.id}
                                      >
                                        {option.label}. {option.optionText}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <form action={deleteQuestionAction}>
                                  <input name="questionId" type="hidden" value={question.id} />
                                  <ConfirmSubmitButton
                                    className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                                    message="Hapus soal ini? Jika soal sudah pernah dipakai, sistem akan menonaktifkannya."
                                    title="Hapus soal"
                                  >
                                    <Trash2 className="size-4" />
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            </article>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                        Belum ada soal untuk step ini.
                      </p>
                    )}

                    <details className="group rounded-md border border-neutral-200 bg-neutral-50">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-neutral-800 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <Plus className="size-4 text-teal-700" />
                          Tambah soal manual
                        </span>
                        <ChevronDown className="size-4 text-neutral-500 transition group-open:rotate-180" />
                      </summary>
                      <form action={createQuestionAction} className="grid gap-3 border-t border-neutral-200 bg-white p-4">
                        <input name="stepId" type="hidden" value={step.id} />
                        <TextArea label="Pertanyaan" name="questionText" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Pilihan A" name="optionA" required />
                          <Field label="Pilihan B" name="optionB" required />
                          <Field label="Pilihan C" name="optionC" required />
                          <Field label="Pilihan D" name="optionD" required />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-neutral-700">Jawaban benar</span>
                            <select
                              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                              defaultValue="A"
                              name="correctLabel"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-neutral-700">Difficulty</span>
                            <select
                              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                              defaultValue="medium"
                              name="difficulty"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </label>
                          <Field defaultValue="1" label="Bobot" name="weight" type="number" />
                        </div>
                        <button
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                          type="submit"
                        >
                          <Plus className="size-4" />
                          Tambah soal
                        </button>
                      </form>
                    </details>
                  </section>
                </div>
              </CollapsibleSection>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
              Belum ada step untuk modul ini. Buat step dari halaman modul sebelum menambahkan kuis.
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
