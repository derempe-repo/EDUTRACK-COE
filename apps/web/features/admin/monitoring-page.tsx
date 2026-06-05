import { Activity, AlertTriangle, Bell, BookOpenCheck, Download, FileText, FileWarning, RotateCcw, ShieldAlert } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMonitoringData } from "@/features/admin/data";
import { getAdminBasePath } from "@/features/admin/urls";
import {
  allowPlagiarismResubmitAction,
  rejectPermanentPlagiarismAction,
} from "@/features/plagiarism/actions";
import { formatAppDateTime } from "@/lib/app-time";
import type { AppProfile } from "@/lib/auth";

export async function AdminMonitoringPage({ profile }: { profile: AppProfile }) {
  const data = await getMonitoringData();
  const basePath = getAdminBasePath(profile.role);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: `${basePath}/dashboard`, label: "Dashboard" }, { label: "Monitoring" }]} />

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-sky-700">
            <Activity className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-sky-800">Kondisi sistem</p>
            <h2 className="mt-1 text-2xl font-semibold text-sky-950">Monitoring Aktivitas</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-900">
              Pantau indikator operasional LMS. Statistik ini ringan dan dihitung dari database
              untuk kebutuhan demo serta pemeriksaan rutin.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={<Activity className="size-5" />} label="Audit event 24 jam" value={data.stats.auditEvents24Hours} />
        <MetricCard icon={<ShieldAlert className="size-5" />} label="Warning exam mode 24 jam" tone="amber" value={data.stats.warningEvents24Hours} />
        <MetricCard icon={<BookOpenCheck className="size-5" />} label="Attempt kuis aktif" value={data.stats.startedQuizAttempts} />
        <MetricCard icon={<Bell className="size-5" />} label="Notifikasi belum dibaca" value={data.stats.unreadNotifications} />
        <MetricCard icon={<FileWarning className="size-5" />} label="Export gagal" tone={data.stats.failedExports > 0 ? "red" : "teal"} value={data.stats.failedExports} />
        <MetricCard icon={<AlertTriangle className="size-5" />} label="Submission flagged" tone={data.stats.flaggedSubmissions > 0 ? "red" : "teal"} value={data.stats.flaggedSubmissions} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="Distribusi user" values={[
          ["Mahasiswa", data.roles.mahasiswa ?? 0],
          ["Dosen", data.roles.dosen ?? 0],
          ["Admin", data.roles.admin ?? 0],
          ["Super Admin", data.roles.super_admin ?? 0],
        ]} />
        <Breakdown title="Status kelas" values={[
          ["Draft", data.classStatuses.draft ?? 0],
          ["Published", data.classStatuses.published ?? 0],
          ["Archived", data.classStatuses.archived ?? 0],
        ]} />
      </div>

      <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
        <h3 className="font-semibold text-red-950">Antrean similarity flagged</h3>
        <p className="mt-1 text-sm leading-6 text-red-900">
          Admin dapat menindaklanjuti kasus yang belum diputuskan dosen. Periksa file sebelum menggunakan override.
        </p>
        {data.flaggedReviews.length > 0 ? (
          <div className="mt-4 space-y-3">
            {data.flaggedReviews.map((review) => (
              <article className="rounded-md border border-red-200 bg-white p-3" key={review.submissionId}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{review.assignmentTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">{review.classTitle} - {review.studentName} - {review.studentEmail}</p>
                    <a className="mt-2 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900" href={`/api/submissions/${review.submissionId}/signed-url`} target="_blank">
                      <FileText className="size-4 shrink-0" />
                      <span className="break-words [overflow-wrap:anywhere]">{review.fileName}</span>
                      <Download className="size-4 shrink-0" />
                    </a>
                  </div>
                  <span className="w-fit rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {review.similarityScore}% / threshold {review.thresholdPercent}%
                  </span>
                </div>
                <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 lg:grid-cols-2">
                  <AdminOverrideForm action={allowPlagiarismResubmitAction} label="Izinkan ulang upload" submissionId={review.submissionId} tone="amber" />
                  <AdminOverrideForm action={rejectPermanentPlagiarismAction} label="Tolak permanen" submissionId={review.submissionId} tone="red" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-white px-3 py-3 text-sm text-slate-600">Tidak ada similarity flagged yang menunggu tindak lanjut.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-950">Aktivitas terbaru</h3>
        <p className="mt-1 text-sm text-slate-600">Sepuluh event terakhir dari audit log.</p>
        {data.recentAuditLogs.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-200">
            {data.recentAuditLogs.map((log) => (
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between" key={log.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.actorRole ?? "system"}</p>
                </div>
                <time className="text-xs text-slate-500">{formatDate(log.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Belum ada aktivitas.</p>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon, label, tone = "teal", value }: { icon: React.ReactNode; label: string; tone?: "amber" | "red" | "teal"; value: number }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Breakdown({ title, values }: { title: string; values: Array<[string, number]> }) {
  const total = values.reduce((sum, item) => sum + item[1], 0);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3">
        {values.map(([label, value]) => (
          <div className="grid grid-cols-[110px_minmax(0,1fr)_36px] items-center gap-3" key={label}>
            <p className="text-sm text-slate-600">{label}</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${total > 0 ? Math.round((value / total) * 100) : 0}%` }} />
            </div>
            <p className="text-right text-sm font-semibold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: Date) {
  return formatAppDateTime(value);
}

function AdminOverrideForm({ action, label, submissionId, tone }: { action: (formData: FormData) => void | Promise<void>; label: string; submissionId: string; tone: "amber" | "red" }) {
  const isRed = tone === "red";
  return (
    <form action={action} className={`rounded-md border p-3 ${isRed ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <input name="submissionId" type="hidden" value={submissionId} />
      <label className="block space-y-2">
        <span className="text-xs font-semibold text-slate-700">Alasan keputusan</span>
        <textarea className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" minLength={10} name="reason" required />
      </label>
      {isRed ? (
        <ConfirmSubmitButton className="mt-2 inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800" message="Tolak permanen submission ini dan tetapkan nilai 0?">
          <AlertTriangle className="size-4" />{label}
        </ConfirmSubmitButton>
      ) : (
        <SubmitButton
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          pendingLabel="Membuka ulang..."
        >
          <RotateCcw className="size-4" />{label}
        </SubmitButton>
      )}
    </form>
  );
}
