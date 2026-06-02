import { ArrowLeft, Award, Download, FileDown, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DosenClassHeader } from "@/components/layout/dosen-class-header";
import { DosenClassNavigation } from "@/components/layout/dosen-class-navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  issueCertificateAction,
  regenerateCertificatePdfAction,
} from "@/features/certificates/actions";
import { getDosenClassDetail } from "@/features/classes/data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenClassReportsPath,
} from "@/features/classes/urls";
import { generateClassExportAction } from "@/features/exports/actions";
import { requireRole } from "@/lib/auth";

type DosenClassReportsPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function DosenClassReportsPage({
  params,
  searchParams,
}: DosenClassReportsPageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const data = await getDosenClassDetail(profile.id, classId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenClassReportsPath(data.classItem);
  if (`/dosen/classes/${classParam}/reports` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const students = data.members.filter((member) => member.role === "student");
  const studentCount = students.length;
  const stepCount = data.modules.reduce((sum, moduleItem) => sum + moduleItem.steps.length, 0);
  const certificateByStudent = new Map(
    data.certificates.map((certificate) => [certificate.studentId, certificate]),
  );

  return (
    <DashboardShell profile={profile} title={`Laporan - ${data.classItem.title}`}>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              { label: "Laporan" },
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

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <FileSpreadsheet className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">Export laporan kelas</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Unduh progres, nilai akhir, dan status sertifikat mahasiswa.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 rounded-md border border-teal-100 bg-teal-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Bobot nilai aktif</p>
                <p className="mt-1 text-sm font-semibold text-teal-950">
                  Tugas {data.classItem.assignmentWeight}% · Kuis {data.classItem.quizWeight}% ·
                  Final Exam {data.classItem.finalExamWeight}%
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={generateClassExportAction}>
                  <input name="classId" type="hidden" value={data.classItem.id} />
                  <input name="format" type="hidden" value="excel" />
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
                    <FileSpreadsheet className="size-4" />
                    Export Excel
                  </button>
                </form>
                <form action={generateClassExportAction}>
                  <input name="classId" type="hidden" value={data.classItem.id} />
                  <input name="format" type="hidden" value="pdf" />
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50">
                    <FileDown className="size-4" />
                    Export PDF
                  </button>
                </form>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Riwayat export</p>
                {data.exports.length > 0 ? (
                  data.exports.map((exportItem) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                      key={exportItem.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {exportItem.fileName ?? `Export ${exportItem.format}`}
                        </p>
                        <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
                          {exportItem.status} · {formatDateTime(exportItem.createdAt)}
                        </p>
                      </div>
                      {exportItem.status === "completed" ? (
                        <Link
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                          href={`/api/exports/${exportItem.id}/download`}
                          title="Unduh export"
                        >
                          <Download className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Belum ada file export.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Award className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">Sertifikat mahasiswa</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Terbitkan atau unduh sertifikat kelulusan digital.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 p-4 sm:p-5">
              {students.length > 0 ? (
                students.map((member) => {
                  const certificate = certificateByStudent.get(member.profileId) ?? null;

                  return (
                    <div
                      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      key={member.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{member.profileName}</p>
                        <p className="truncate text-xs text-slate-500">{member.profileEmail}</p>
                        <p className="mt-1 text-xs font-semibold capitalize text-amber-700">
                          {certificate
                            ? `${certificate.status}${certificate.certificateNumber ? ` · ${certificate.certificateNumber}` : ""}`
                            : "Belum diterbitkan"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {certificate?.status === "issued" ? (
                          <>
                            <Link
                              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                              href={`/api/certificates/${certificate.id}/download`}
                            >
                              <Download className="size-3.5" />
                              Unduh
                            </Link>
                            <form action={regenerateCertificatePdfAction}>
                              <input name="classId" type="hidden" value={data.classItem.id} />
                              <input name="studentId" type="hidden" value={member.profileId} />
                              <button className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                                Buat ulang PDF
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={issueCertificateAction}>
                            <input name="classId" type="hidden" value={data.classItem.id} />
                            <input name="studentId" type="hidden" value={member.profileId} />
                            <button className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800">
                              Coba terbitkan
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-600">Belum ada mahasiswa di kelas ini.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </DashboardShell>
  );
}
