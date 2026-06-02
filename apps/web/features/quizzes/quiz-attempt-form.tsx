"use client";

import { useState } from "react";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { submitQuizAttemptAction } from "@/features/quizzes/actions";

type QuizAttemptQuestion = {
  id: string;
  options: {
    id: string;
    label: string;
    optionText: string;
  }[];
  questionText: string;
  weight: number;
};

type QuizAttemptFormProps = {
  attemptId: string;
  questions: QuizAttemptQuestion[];
};

export function QuizAttemptForm({ attemptId, questions }: QuizAttemptFormProps) {
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(() => new Set<string>());
  const answeredCount = answeredQuestionIds.size;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  function markAnswered(questionId: string) {
    setAnsweredQuestionIds((current) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
  }

  return (
    <form action={submitQuizAttemptAction}>
      <input name="attemptId" type="hidden" value={attemptId} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 xl:order-1">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Daftar soal</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Kerjakan dengan teliti</h2>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {answeredCount} dari {questions.length} terjawab
            </span>
          </div>

          <div className="space-y-3 xl:max-h-[calc(100vh-29rem)] xl:min-h-72 xl:overflow-y-auto xl:pr-2">
            {questions.map((question, index) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={question.id}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-sm font-bold text-teal-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-6 text-slate-950">{question.questionText}</p>
                    <p className="mt-1 text-xs text-slate-400">Bobot {question.weight}</p>
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => (
                        <label
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-50 has-[:checked]:text-cyan-800 hover:border-cyan-200 hover:bg-cyan-50"
                          key={option.id}
                        >
                          <input
                            className="mt-1 accent-teal-700"
                            name={`answer_${question.id}`}
                            onChange={() => markAnswered(question.id)}
                            required
                            type="radio"
                            value={option.id}
                          />
                          <span className="min-w-0">
                            <span className="font-semibold">{option.label}.</span>{" "}
                            <span className="break-words [overflow-wrap:anywhere]">
                              {option.optionText}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-0 xl:order-2 xl:self-start">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Progres jawaban</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Pastikan setiap soal memiliki satu jawaban sebelum dikirim.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-teal-600 transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
              <p>{answeredCount} soal terjawab</p>
              <p>{unansweredCount} soal belum dijawab</p>
            </div>
            <ConfirmSubmitButton
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[#123044] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1b445b]"
              message="Kirim jawaban sekarang? Pastikan seluruh jawaban sudah diperiksa karena nilai akan dihitung otomatis."
              title="Kirim jawaban kuis"
            >
              Kirim jawaban
            </ConfirmSubmitButton>
          </section>

          <section className="hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:block">
            <h2 className="text-sm font-semibold text-slate-900">Exam mode</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Tetap berada pada halaman ini selama kuis berlangsung. Perpindahan tab akan tercatat
              sebagai warning.
            </p>
          </section>
        </aside>
      </div>
    </form>
  );
}
