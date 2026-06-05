import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Layers,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClassAction } from "@/features/classes/actions";
import { getCachedDosenDashboardData } from "@/features/classes/cached-data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  getDosenClassPath,
  getDosenModuleAssignmentsPath,
} from "@/features/classes/urls";
import { formatAppDateTime } from "@/lib/app-time";
import { requireRole } from "@/lib/auth";

const statusLabels = {
  archived: "Archived",
  draft: "Draft",
  published: "Published",
} as const;

const statusStyles = {
  archived: "border-slate-200 bg-slate-50 text-slate-600",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

type DosenDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenDashboardPage({ searchParams }: DosenDashboardPageProps) {
  const profile = await requireRole(["dosen"]);
  const data = await getCachedDosenDashboardData(profile.id);
  const feedback = getFeedbackNotice(await searchParams);

  return (
    <DashboardShell profile={profile} title="Dashboard">
      <div className="space-y-6 sm:space-y-8">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#123044] px-5 py-6 text-white sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">Ruang dosen</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]">
              Selamat datang, {profile.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/80">
              Pantau kelas, tindak lanjuti submission mahasiswa, dan kelola materi pembelajaran
              dari satu ruang kerja.
            </p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<BookOpen className="size-4" />}
              label="Total kelas"
              value={data.stats.totalClasses}
            />
            <StatCard
              icon={<CheckCircle2 className="size-4" />}
              label="Kelas published"
              value={data.stats.publishedClasses}
            />
            <StatCard
              icon={<Users className="size-4" />}
              label="Mahasiswa aktif"
              value={data.stats.totalStudents}
            />
            <StatCard
              icon={<ClipboardCheck className="size-4" />}
              label="Perlu direview"
              tone={data.stats.pendingReviews > 0 ? "attention" : "default"}
              value={data.stats.pendingReviews}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="space-y-4" id="kelas-diampu">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Ruang ajar</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Kelas yang diampu</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Masuk ke kelas untuk mengelola modul, anggota, sertifikat, dan laporan.
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-500">{data.classes.length} kelas</span>
              </div>

              {data.classes.length > 0 ? (
                <div className="grid gap-3">
                  {data.classes.map((classItem) => (
                    <article
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-5"
                      key={classItem.id}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">{classItem.title}</h3>
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[classItem.status]}`}
                            >
                              {statusLabels[classItem.status]}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {classItem.description ?? "Belum ada deskripsi kelas."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Layers className="size-3.5 text-teal-700" />
                              {classItem.moduleCount} modul
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="size-3.5 text-teal-700" />
                              {classItem.studentCount} mahasiswa
                            </span>
                          </div>
                        </div>
                        <Link
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[#123044] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b] sm:w-auto"
                          href={getDosenClassPath(classItem)}
                        >
                          Kelola kelas
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm leading-6 text-slate-600">
                  Belum ada kelas. Gunakan panel kelas baru untuk memulai ruang ajar pertama.
                </div>
              )}
            </section>

            <section className="space-y-4" id="antrean-review">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Tindak lanjut</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Antrean review submission</h2>
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  {data.stats.pendingReviews} menunggu
                </span>
              </div>

              {data.pendingReviews.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {data.pendingReviews.map((review) => (
                    <Link
                      className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-teal-50/50 sm:flex-row sm:items-center sm:justify-between"
                      href={getDosenModuleAssignmentsPath(
                        { id: review.classId, title: review.classTitle },
                        { id: review.moduleId, title: review.moduleTitle },
                      )}
                      key={review.submissionId}
                    >
                      <div className="flex min-w-0 gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {review.assignmentTitle}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {review.studentName} · {review.classTitle}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock3 className="size-3" />
                            {formatAppDateTime(review.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-700">
                        Review
                        <ArrowRight className="size-3.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  Tidak ada submission yang menunggu review. Antrean sudah bersih.
                </div>
              )}
            </section>
          </div>

          <form action={createClassAction} className="h-fit rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <Plus className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Buat kelas baru</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Mulai dari identitas kelas.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Field label="Nama kelas" name="title" placeholder="Pemrograman Web Dasar" required />
              <TextArea
                label="Deskripsi"
                name="description"
                placeholder="Ringkasan capaian atau aturan belajar."
              />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Status awal</span>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  defaultValue="draft"
                  name="status"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            <SubmitButton
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
              pendingLabel="Membuat kelas..."
            >
              <Plus className="size-4" />
              Buat kelas
            </SubmitButton>
            </div>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  tone = "default",
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "attention" | "default";
  value: number;
}) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <span
          className={`inline-flex size-8 items-center justify-center rounded-md ${
            tone === "attention" ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-700"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}
