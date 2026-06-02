import { ArrowLeft, Search, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DosenClassHeader } from "@/components/layout/dosen-class-header";
import { DosenClassNavigation } from "@/components/layout/dosen-class-navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { enrollStudentAction, removeClassMemberAction } from "@/features/classes/actions";
import { getDosenClassDetail } from "@/features/classes/data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassMembersPath,
  getDosenClassPath,
} from "@/features/classes/urls";
import { getClassReportData } from "@/features/exports/data";
import { requireRole } from "@/lib/auth";

type DosenClassMembersPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenClassMembersPage({
  params,
  searchParams,
}: DosenClassMembersPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const resolvedSearchParams = await searchParams;
  const data = await getDosenClassDetail(profile.id, classId);
  const feedback = getFeedbackNotice(resolvedSearchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenClassMembersPath(data.classItem);
  if (`/dosen/classes/${classParam}/members` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const queryValue = resolvedSearchParams?.q;
  const query = (Array.isArray(queryValue) ? queryValue[0] : queryValue)?.trim().toLowerCase() ?? "";
  const report = await getClassReportData(data.classItem.id);
  const reportByEmail = new Map(report?.students.map((student) => [student.email, student]) ?? []);
  const students = data.members
    .filter((member) => member.role === "student")
    .filter(
      (member) =>
        !query ||
        member.profileName.toLowerCase().includes(query) ||
        member.profileEmail.toLowerCase().includes(query),
    );
  const studentCount = data.members.filter((member) => member.role === "student").length;
  const stepCount = data.modules.reduce((sum, moduleItem) => sum + moduleItem.steps.length, 0);

  return (
    <DashboardShell profile={profile} title={`Anggota - ${data.classItem.title}`}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              { label: "Anggota" },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href={getDosenClassPath(data.classItem)}
          >
            <ArrowLeft className="size-4" />
            Kembali ke overview
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <DosenClassHeader
          classItem={data.classItem}
          moduleCount={data.modules.length}
          stepCount={stepCount}
          studentCount={studentCount}
        />
        <DosenClassNavigation classItem={data.classItem} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Enrollment</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Anggota kelas</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Pantau progres dan kelola mahasiswa yang memiliki akses ke kelas ini.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{studentCount} mahasiswa</span>
            </div>

            <form className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  defaultValue={query}
                  name="q"
                  placeholder="Cari nama atau email mahasiswa"
                />
              </label>
              <button
                className="inline-flex items-center justify-center rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
                type="submit"
              >
                Cari
              </button>
            </form>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Mahasiswa</th>
                        <th className="px-4 py-3">Progres</th>
                        <th className="px-4 py-3">Nilai</th>
                        <th className="px-4 py-3">Sertifikat</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((member) => {
                        const reportItem = reportByEmail.get(member.profileEmail);

                        return (
                          <tr className="transition hover:bg-teal-50/40" key={member.id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-950">{member.profileName}</p>
                              <p className="mt-1 text-xs text-slate-500">{member.profileEmail}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-teal-600"
                                    style={{ width: `${reportItem?.progressPercent ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-600">
                                  {reportItem?.progressPercent ?? 0}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {reportItem?.finalScore ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold capitalize text-slate-600">
                                {reportItem?.certificateStatus ?? "belum tersedia"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <form action={removeClassMemberAction}>
                                <input name="classId" type="hidden" value={data.classItem.id} />
                                <input name="memberId" type="hidden" value={member.id} />
                                <ConfirmSubmitButton
                                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                                  message={`Keluarkan ${member.profileName} dari kelas ini?`}
                                  title="Hapus anggota"
                                >
                                  <UserMinus className="size-4" />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-sm leading-6 text-slate-600">
                  {query ? "Tidak ada mahasiswa yang cocok dengan pencarian." : "Belum ada mahasiswa di kelas ini."}
                </div>
              )}
            </div>
          </div>

          <form action={enrollStudentAction} className="h-fit rounded-lg border border-slate-200 bg-white shadow-sm">
            <input name="classId" type="hidden" value={data.classItem.id} />
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <UserPlus className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Tambah mahasiswa</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Enroll melalui email akun aktif.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email mahasiswa</span>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  name="email"
                  placeholder="mahasiswa.demo@lms.test"
                  required
                  type="email"
                />
              </label>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
                type="submit"
              >
                <UserPlus className="size-4" />
                Enroll mahasiswa
              </button>
            </div>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
