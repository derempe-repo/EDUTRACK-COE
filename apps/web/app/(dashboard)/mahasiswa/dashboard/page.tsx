import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Layers,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getMahasiswaDashboardData } from "@/features/classes/data";
import { getMahasiswaClassPath } from "@/features/classes/urls";
import { requireRole } from "@/lib/auth";

export default async function MahasiswaDashboardPage() {
  const profile = await requireRole(["mahasiswa"]);
  const data = await getMahasiswaDashboardData(profile.id);
  const continueClass = data.classes[0] ?? null;

  return (
    <DashboardShell profile={profile} title="Dashboard">
      <div className="space-y-6 sm:space-y-8">
        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Selamat datang kembali
          </p>
          <h2 className="mt-2 max-w-3xl text-2xl font-bold leading-tight text-[#123044] sm:text-[30px]">
            Belajar terarah, satu langkah setiap hari.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pantau progres seluruh kelas dan lanjutkan aktivitas belajar Anda.
          </p>
        </section>

        <section aria-labelledby="statistik-belajar">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900" id="statistik-belajar">
                Ringkasan semua kelas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Akumulasi aktivitas dari kelas aktif yang sedang Anda ikuti.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatCard
              icon={<TrendingUp className="size-4" />}
              label="Progres kelas"
              value={
                data.stats.totalProgressPercent > 0
                  ? `${data.stats.totalProgressPercent}%`
                  : "Belum aktif"
              }
            />
            <StatCard
              icon={<Star className="size-4" />}
              label="Rata-rata nilai"
              value={data.stats.averageScore > 0 ? data.stats.averageScore : "Belum ada"}
            />
            <StatCard
              icon={<Award className="size-4" />}
              label="Badge"
              value={data.stats.badgesCount > 0 ? data.stats.badgesCount : "Belum ada"}
            />
            <StatCard
              icon={<Star className="size-4" />}
              label="Poin"
              value={
                data.stats.gamificationPoints > 0 ? data.stats.gamificationPoints : "Belum ada"
              }
            />
            <StatCard
              className="col-span-2 xl:col-span-1"
              icon={<Layers className="size-4" />}
              label="Modul aktif"
              value={data.stats.activeModulesCount}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_354px]">
          <div className="space-y-6">
            {continueClass ? (
              <section className="rounded-lg bg-[#123044] p-4 text-white shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
                    Lanjutkan belajar
                  </p>
                  <span className="text-sm font-semibold text-sky-100">
                    {continueClass.progress.percent}%
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{continueClass.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-sky-100/80">
                  {continueClass.description ?? "Lanjutkan aktivitas berikutnya pada kelas ini."}
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${continueClass.progress.percent}%` }}
                  />
                </div>
                <Link
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#e7b75b]"
                  href={getMahasiswaClassPath(continueClass)}
                >
                  Buka kelas
                  <ArrowRight className="size-4" />
                </Link>
              </section>
            ) : null}

            <section className="space-y-3" id="kelas-diikuti">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    Ruang belajar
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Kelas diikuti</h2>
                </div>
                <span className="text-sm font-medium text-slate-500">{data.classes.length} kelas</span>
              </div>

              {data.classes.length > 0 ? (
                <div className="grid gap-3">
                  {data.classes.map((classItem) => (
                    <article
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md sm:p-5"
                      key={classItem.id}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{classItem.title}</h3>
                            <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-bold uppercase text-teal-700">
                              {classItem.moduleCount} modul
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {classItem.description ?? "Belum ada deskripsi kelas."}
                          </p>
                          <div className="mt-4">
                            <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                              <span>
                                {classItem.progress.verified}/{classItem.progress.total} aktivitas selesai
                              </span>
                              <span>{classItem.progress.percent}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-teal-600"
                                style={{ width: `${classItem.progress.percent}%` }}
                              />
                            </div>
                            {classItem.progress.submitted > 0 || classItem.progress.failed > 0 ? (
                              <p className="mt-2 text-xs text-slate-500">
                                {classItem.progress.submitted} menunggu review,{" "}
                                {classItem.progress.failed} perlu perbaikan.
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <Link
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#123044] transition hover:border-teal-300 hover:bg-teal-50 sm:w-fit"
                          href={getMahasiswaClassPath(classItem)}
                        >
                          Buka
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm leading-6 text-slate-600">
                  Belum ada enrollment kelas untuk akun ini.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-[92px] xl:h-fit">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                  <BookOpen className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">Modul aktif</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {data.activeModules.length} modul dapat dipelajari
                  </p>
                </div>
              </div>
              {data.activeModules.length > 0 ? (
                <div className="max-h-[25rem] space-y-2 overflow-y-auto pr-1">
                  {data.activeModules.map((moduleItem) => (
                    <article
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      key={moduleItem.id}
                    >
                      <p className="line-clamp-2 break-words text-sm font-semibold text-slate-900">
                        {moduleItem.title}
                      </p>
                      <p className="mt-1 line-clamp-1 break-words text-xs text-slate-500">
                        {moduleItem.classTitle}
                      </p>
                      <Link
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 transition hover:text-teal-900"
                        href={getMahasiswaClassPath({
                          id: moduleItem.classId,
                          title: moduleItem.classTitle,
                        })}
                      >
                        Buka kelas
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Belum ada modul aktif.</p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <Bell className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">Notifikasi terbaru</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Update aktivitas belajar</p>
                </div>
                <Link
                  className="shrink-0 text-xs font-bold text-teal-700 transition hover:text-teal-900"
                  href="/notifications"
                >
                  Semua
                </Link>
              </div>
              {data.notifications.length > 0 ? (
                <div className="space-y-2">
                  {data.notifications.map((notification) => (
                    <article
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      key={notification.id}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          className={
                            notification.status === "unread"
                              ? "mt-0.5 size-4 shrink-0 text-amber-600"
                              : "mt-0.5 size-4 shrink-0 text-slate-300"
                          }
                        />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900">
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500">
                            {notification.body}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Belum ada notifikasi.</p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  className = "",
  icon,
  label,
  value,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <article className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xl font-bold text-[#123044]">{value}</p>
    </article>
  );
}
