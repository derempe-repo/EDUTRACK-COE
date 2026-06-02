import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  FileText,
  Link as LinkIcon,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  createMaterialAction,
  createStepAction,
  deleteMaterialAction,
  deleteModuleAction,
  deleteStepAction,
  updateModuleAction,
  updateStepAction,
} from "@/features/classes/actions";
import { getDosenModuleLearningDetail } from "@/features/classes/data";
import { getFeedbackNotice } from "@/features/classes/feedback";
import {
  extractIdFromSlugParam,
  getDosenClassPath,
  getDosenModuleAssignmentsPath,
  getDosenModulePath,
  getDosenModuleQuizzesPath,
} from "@/features/classes/urls";
import { requireRole } from "@/lib/auth";

type DosenModulePageProps = {
  params: Promise<{
    classId: string;
    moduleId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosenModulePage({ params, searchParams }: DosenModulePageProps) {
  const profile = await requireRole(["dosen"]);
  const { classId: classParam, moduleId: moduleParam } = await params;
  const classId = extractIdFromSlugParam(classParam);
  const moduleId = extractIdFromSlugParam(moduleParam);
  const data = await getDosenModuleLearningDetail(profile.id, classId, moduleId);
  const feedback = getFeedbackNotice(await searchParams);

  if (!data) {
    notFound();
  }

  const canonicalPath = getDosenModulePath(data.classItem, data.moduleItem);
  if (`/dosen/classes/${classParam}/modules/${moduleParam}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const materialCount = data.moduleItem.steps.reduce((sum, step) => sum + step.materials.length, 0);
  const assignmentCount = data.moduleItem.steps.reduce((sum, step) => sum + step.assignmentCount, 0);
  const quizCount = data.moduleItem.steps.reduce((sum, step) => sum + step.quizCount, 0);

  return (
    <DashboardShell profile={profile} title={data.moduleItem.title}>
      <div className="space-y-8">
        <div className="space-y-3">
          <Breadcrumbs
            items={[
              { label: "Kelas", href: "/dosen/dashboard" },
              { label: data.classItem.title, href: getDosenClassPath(data.classItem) },
              { label: `Modul-${data.moduleItem.title}` },
            ]}
          />
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            href={getDosenClassPath(data.classItem)}
          >
            <ArrowLeft className="size-4" />
            {data.classItem.title}
          </Link>
        </div>

        {feedback ? (
          <DismissibleAlert title={feedback.title} tone={feedback.tone}>
            {feedback.message}
          </DismissibleAlert>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#123044] px-5 py-6 text-white sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">Struktur modul</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]">
              {data.moduleItem.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
              {data.moduleItem.description ?? "Belum ada deskripsi modul."}
            </p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-4">
            <StatCard icon={<BookOpen className="size-4" />} label="Step" value={data.moduleItem.steps.length} />
            <StatCard icon={<FileText className="size-4" />} label="Materi" value={materialCount} />
            <StatCard icon={<ClipboardList className="size-4" />} label="Tugas" value={assignmentCount} />
            <StatCard icon={<ClipboardList className="size-4" />} label="Kuis" value={quizCount} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ManageCard
            body="Kelola instruksi tugas, lampiran PDF, submission mahasiswa, nilai, feedback, dan resubmit."
            href={getDosenModuleAssignmentsPath(data.classItem, data.moduleItem)}
            icon={<ClipboardList className="size-5" />}
            meta={`${assignmentCount} tugas`}
            title="Kelola Tugas"
            tone="teal"
          />
          <ManageCard
            body="Kelola kuis, attempt mahasiswa, dan bank soal pilihan ganda yang akan diacak saat mulai kuis."
            href={getDosenModuleQuizzesPath(data.classItem, data.moduleItem)}
            icon={<BookOpen className="size-5" />}
            meta={`${quizCount} kuis`}
            title="Kelola Kuis dan Bank Soal"
            tone="amber"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-sm font-semibold text-teal-700">Pengaturan modul</p>
                <h2 className="mt-1 text-lg font-semibold">Detail Modul</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  Halaman ini fokus untuk struktur step dan materi. Tugas dan kuis dikelola dari
                  halaman khusus di atas.
                </p>
              </div>
              <form action={updateModuleAction} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                <input name="moduleId" type="hidden" value={data.moduleItem.id} />
                <Field defaultValue={data.moduleItem.title} label="Nama modul" name="title" required />
                <Field
                  defaultValue={String(data.moduleItem.sortOrder)}
                  label="Urutan"
                  name="sortOrder"
                  type="number"
                />
                <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                  <input defaultChecked={data.moduleItem.isLocked} name="isLocked" type="checkbox" />
                  Terkunci
                </label>
                <div className="md:col-span-2">
                  <TextArea
                    defaultValue={data.moduleItem.description ?? ""}
                    label="Deskripsi modul"
                    name="description"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    type="submit"
                  >
                    <Save className="size-4" />
                    Simpan
                  </button>
                </div>
              </form>
              <form action={deleteModuleAction} className="mt-3">
                <input name="moduleId" type="hidden" value={data.moduleItem.id} />
                <ConfirmSubmitButton
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  message="Hapus modul ini? Semua step dan materi di dalamnya akan ikut terhapus."
                >
                  <Trash2 className="size-4" />
                  Hapus modul
                </ConfirmSubmitButton>
              </form>
            </div>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-700">Alur pembelajaran</p>
                  <h2 className="text-lg font-semibold">Step dan Materi</h2>
                </div>
                <span className="text-sm text-neutral-500">{data.moduleItem.steps.length} step</span>
              </div>

              {data.moduleItem.steps.length > 0 ? (
                data.moduleItem.steps.map((step, index) => (
                  <CollapsibleSection
                    defaultOpen={index === 0}
                    eyebrow={`Step ${step.sortOrder}`}
                    key={step.id}
                    meta={
                      <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                        {step.isRequired ? (
                          <span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-teal-700">
                            Wajib
                          </span>
                        ) : null}
                        <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-amber-700">
                          {step.materials.length} materi
                        </span>
                      </div>
                    }
                    summary={step.description ?? "Belum ada deskripsi step."}
                    title={step.title}
                    tone="step"
                  >
                    <div className="space-y-3 p-4">
                      <form action={updateStepAction} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                        <input name="stepId" type="hidden" value={step.id} />
                        <Field defaultValue={step.title} label="Nama step" name="title" required />
                        <Field
                          defaultValue={String(step.sortOrder)}
                          label="Urutan"
                          name="sortOrder"
                          type="number"
                        />
                        <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                          <input defaultChecked={step.isRequired} name="isRequired" type="checkbox" />
                          Wajib
                        </label>
                        <div className="md:col-span-2">
                          <TextArea
                            defaultValue={step.description ?? ""}
                            label="Deskripsi step"
                            name="description"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                            type="submit"
                          >
                            <Save className="size-4" />
                            Step
                          </button>
                        </div>
                      </form>
                      <form action={deleteStepAction}>
                        <input name="stepId" type="hidden" value={step.id} />
                        <ConfirmSubmitButton
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                          message="Hapus step ini? Materi yang menempel pada step ini juga akan terhapus."
                        >
                          <Trash2 className="size-4" />
                          Hapus step
                        </ConfirmSubmitButton>
                      </form>
                    </div>

                    <div className="space-y-4 border-t border-neutral-200 p-4">
                      <div className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-amber-950">Materi</p>
                        <p className="mt-1 text-sm leading-6 text-amber-900">
                          Materi adalah file atau tautan yang dibaca mahasiswa pada step ini.
                        </p>
                      </div>

                      {step.materials.length > 0 ? (
                        <div className="space-y-2">
                          {step.materials.map((material) => (
                            <div
                              className="flex flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              key={material.id}
                            >
                              <a
                                className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-sky-950 transition hover:text-sky-700"
                                href={
                                  material.storagePath
                                    ? `/api/materials/${material.id}/signed-url`
                                    : (material.url ?? "#")
                                }
                                rel="noreferrer"
                                target="_blank"
                              >
                                <LinkIcon className="size-4 shrink-0" />
                                <span className="truncate">{material.title}</span>
                                <span className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs uppercase text-sky-700">
                                  {material.type}
                                </span>
                              </a>
                              <form action={deleteMaterialAction}>
                                <input name="materialId" type="hidden" value={material.id} />
                                <ConfirmSubmitButton
                                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                                  message={`Hapus materi "${material.title}"?`}
                                  title="Hapus materi"
                                >
                                  <Trash2 className="size-4" />
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                          Belum ada materi untuk step ini.
                        </p>
                      )}

                      <form
                        action={createMaterialAction}
                        className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]"
                      >
                        <input name="stepId" type="hidden" value={step.id} />
                        <Field label="Materi" name="title" placeholder="Referensi HTML" required />
                        <label className="block space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Tipe</span>
                          <select
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                            defaultValue="link"
                            name="type"
                          >
                            <option value="link">Link</option>
                            <option value="pdf">PDF</option>
                            <option value="video">Video</option>
                            <option value="slide">Slide</option>
                          </select>
                        </label>
                        <Field defaultValue="1" label="Urutan" name="sortOrder" type="number" />
                        <div className="flex items-end">
                          <button
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                            type="submit"
                          >
                            <Upload className="size-4" />
                            Materi
                          </button>
                        </div>
                        <div className="md:col-span-2">
                          <Field
                            label="URL eksternal"
                            name="url"
                            placeholder="https://example.com/materi atau video"
                            type="url"
                          />
                        </div>
                        <label className="block space-y-2 md:col-span-2">
                          <span className="text-sm font-medium text-neutral-700">File PDF/slide</span>
                          <input
                            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                            name="file"
                            type="file"
                          />
                        </label>
                        <div className="md:col-span-2">
                          <TextArea label="Deskripsi materi" name="description" />
                        </div>
                      </form>
                    </div>
                  </CollapsibleSection>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
                  Belum ada step untuk modul ini.
                </div>
              )}
            </section>
          </div>

          <form
            action={createStepAction}
            className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"
          >
            <input name="moduleId" type="hidden" value={data.moduleItem.id} />
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Step Baru</h2>
                <p className="text-sm text-neutral-500">Buat tahap belajar di dalam modul.</p>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Nama step" name="title" placeholder="Membaca materi" required />
              <TextArea label="Deskripsi" name="description" />
              <Field defaultValue="1" label="Urutan" name="sortOrder" type="number" />
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input defaultChecked name="isRequired" type="checkbox" />
                Wajib
              </label>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                type="submit"
              >
                <Plus className="size-4" />
                Buat step
              </button>
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
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ManageCard({
  body,
  href,
  icon,
  meta,
  title,
  tone,
}: {
  body: string;
  href: string;
  icon: React.ReactNode;
  meta: string;
  title: string;
  tone: "amber" | "teal";
}) {
  const styles =
    tone === "teal"
      ? "border-teal-200 bg-teal-50 text-teal-950"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <Link
      className={`rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles}`}
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase">{meta}</p>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{body}</p>
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-white/70">
          {icon}
        </span>
      </div>
    </Link>
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
