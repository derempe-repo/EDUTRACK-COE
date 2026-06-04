"use client";

import { ChevronDown, Download, FileSpreadsheet, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { importQuestionsAction } from "@/features/quizzes/actions";
import type { QuestionImportPreview } from "@/features/quizzes/question-import";

export function QuestionImportPanel({ stepId }: { stepId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<QuestionImportPreview | null>(null);
  const canImport =
    preview &&
    preview.fatalErrors.length === 0 &&
    preview.invalidCount === 0 &&
    preview.validCount > 0;
  const payload = canImport
    ? JSON.stringify(preview.rows.flatMap((row) => (row.data ? [row.data] : [])))
    : "";

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError("Pilih file Excel terlebih dahulu.");
      setPreview(null);
      return;
    }

    setError(null);
    setIsLoading(true);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("stepId", stepId);
      const response = await fetch("/api/question-import/preview", {
        body: formData,
        method: "POST",
      });
      const result = (await response.json()) as QuestionImportPreview | { error?: string };

      if (!response.ok) {
        setError("error" in result && result.error ? result.error : "Preview file belum berhasil dibuat.");
        return;
      }

      setPreview(result as QuestionImportPreview);
    } catch {
      setError("Preview file belum berhasil dibuat. Coba muat ulang halaman.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetPreview() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError(null);
    setFileName("");
    setPreview(null);
  }

  return (
    <details className="group rounded-lg border border-teal-200 bg-teal-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-teal-950 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <FileSpreadsheet className="size-4 shrink-0 text-teal-700" />
          Import soal dari Excel
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-md border border-teal-200 bg-white px-2 py-1 text-xs text-teal-700">
            Maks. 200 soal
          </span>
          <ChevronDown className="size-4 text-teal-700 transition group-open:rotate-180" />
        </span>
      </summary>

      <div className="space-y-4 border-t border-teal-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-teal-900">
            Unduh template, isi soal pilihan ganda, lalu unggah kembali file <strong>.xlsx</strong>.
            Sistem akan memeriksa seluruh baris sebelum menyimpan.
          </p>
          <a
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 sm:w-fit"
            href="/api/question-import/template"
          >
            <Download className="size-4" />
            Unduh template
          </a>
        </div>

        <form className="grid gap-3" onSubmit={handlePreview}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-teal-950">File bank soal Excel</span>
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-teal-800"
              name="file"
              onChange={(event) => {
                setFileName(event.target.files?.[0]?.name ?? "");
                setError(null);
                setPreview(null);
              }}
              ref={fileInputRef}
              type="file"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isLoading ? "Memeriksa file..." : "Preview dan validasi"}
            </button>
            {fileName || preview ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
                onClick={resetPreview}
                type="button"
              >
                <RotateCcw className="size-4" />
                Reset
              </button>
            ) : null}
          </div>
        </form>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <PreviewStat label="Baris dibaca" value={preview.rows.length} />
              <PreviewStat label="Valid" tone="success" value={preview.validCount} />
              <PreviewStat label="Perlu diperbaiki" tone={preview.invalidCount > 0 ? "danger" : "neutral"} value={preview.invalidCount} />
            </div>

            {preview.fatalErrors.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                {preview.fatalErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}

            {preview.rows.length > 0 ? (
              <div className="max-h-80 overflow-auto rounded-md border border-teal-200 bg-white">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-teal-100 text-teal-950">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Baris</th>
                      <th className="px-3 py-2 font-semibold">Pertanyaan</th>
                      <th className="px-3 py-2 font-semibold">Jawaban</th>
                      <th className="px-3 py-2 font-semibold">Difficulty</th>
                      <th className="px-3 py-2 font-semibold">Bobot</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr className="border-t border-teal-100 align-top" key={row.rowNumber}>
                        <td className="px-3 py-2 font-semibold text-neutral-700">{row.rowNumber}</td>
                        <td className="max-w-md px-3 py-2 leading-5 text-neutral-800">
                          {row.values.questionText || "-"}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">{row.values.correctLabel || "-"}</td>
                        <td className="px-3 py-2 text-neutral-700">{row.values.difficulty || "-"}</td>
                        <td className="px-3 py-2 text-neutral-700">{row.values.weight || "-"}</td>
                        <td className="min-w-56 px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="font-semibold text-emerald-700">Siap disimpan</span>
                          ) : (
                            <ul className="space-y-1 text-red-700">
                              {row.errors.map((message) => (
                                <li key={message}>{message}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {canImport ? (
              <form action={importQuestionsAction}>
                <input name="payload" type="hidden" value={payload} />
                <input name="stepId" type="hidden" value={stepId} />
                <SubmitButton
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-fit"
                  pendingLabel="Menyimpan soal..."
                >
                  <Upload className="size-4" />
                  Simpan {preview.validCount} soal
                </SubmitButton>
              </form>
            ) : preview.rows.length > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                Perbaiki seluruh baris bermasalah pada file, lalu unggah ulang untuk melanjutkan.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function PreviewStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "danger" | "neutral" | "success";
  value: number;
}) {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-teal-200 bg-white text-teal-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className={`rounded-md border px-3 py-2 ${tones[tone]}`}>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
