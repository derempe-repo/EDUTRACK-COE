import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  Link as LinkIcon,
  Plus,
  Save,
  Settings,
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

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    Alur pembelajaran
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Step dan materi</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Buka step untuk melihat materi. Form pengaturan tersedia saat diperlukan.
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
                    <div className="space-y-4">
                      <div className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-amber-950">Materi</p>
                        <p className="mt-1 text-sm leading-6 text-amber-900">
                          Materi adalah file atau tautan yang dibaca mahasiswa pada step ini.
                        </p>
                      </div>

                      {step.materials.length > 0 ? (
                        <div className="min-w-0 space-y-2">
                          {step.materials.map((material) => (
                            <div
                              className="flex min-w-0 flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              key={material.id}
                            >
                              <a
                                className="inline-flex w-full min-w-0 max-w-full items-center gap-2 text-sm font-semibold text-sky-950 transition hover:text-sky-700"
                                href={
                                  material.storagePath
                                    ? `/api/materials/${material.id}/signed-url`
                                    : (material.url ?? "#")
                                }
                                rel="noreferrer"
                                target="_blank"
                              >
                                <LinkIcon className="size-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{material.title}</span>
                                <span className="shrink-0 rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs uppercase text-sky-700">
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

                      <details className="group rounded-md border border-slate-200 bg-slate-50">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-2">
                            <Plus className="size-4 text-teal-700" />
                            Tambah materi
                          </span>
                          <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
                        </summary>
                        <form
                          action={createMaterialAction}
                          className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-[1fr_120px_120px_auto]"
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
                            <span className="text-sm font-medium text-neutral-700">
                              File PDF/slide
                            </span>
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
                      </details>

                      <details className="group rounded-md border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Settings className="size-4 text-slate-500" />
                            Pengaturan step
                          </span>
                          <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
                        </summary>
                        <div className="space-y-3 border-t border-slate-200 p-4">
                          <form
                            action={updateStepAction}
                            className="grid gap-3 md:grid-cols-[1fr_120px_auto]"
                          >
                            <input name="stepId" type="hidden" value={step.id} />
                            <Field defaultValue={step.title} label="Nama step" name="title" required />
                            <Field
                              defaultValue={String(step.sortOrder)}
                              label="Urutan"
                              name="sortOrder"
                              type="number"
                            />
                            <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                              <input
                                defaultChecked={step.isRequired}
                                name="isRequired"
                                type="checkbox"
                              />
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
                                Simpan step
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
                      </details>
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

          <div className="space-y-4">
            <form
              action={createStepAction}
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <input name="moduleId" type="hidden" value={data.moduleItem.id} />
              <div className="border-b border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                    <Plus className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Step baru</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Tambahkan tahap belajar modul.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <Field label="Nama step" name="title" placeholder="Membaca materi" required />
                <TextArea label="Deskripsi" name="description" />
                <Field defaultValue="1" label="Urutan" name="sortOrder" type="number" />
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input defaultChecked name="isRequired" type="checkbox" />
                  Wajib
                </label>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123044] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a425b]"
                  type="submit"
                >
                  <Plus className="size-4" />
                  Buat step
                </button>
              </div>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Akses cepat</p>
              <div className="mt-3 grid gap-2">
                <ShortcutLink
                  body={`${assignmentCount} tugas dalam modul`}
                  href={getDosenModuleAssignmentsPath(data.classItem, data.moduleItem)}
                  icon={<ClipboardList className="size-4" />}
                  label="Kelola tugas"
                />
                <ShortcutLink
                  body={`${quizCount} kuis dalam modul`}
                  href={getDosenModuleQuizzesPath(data.classItem, data.moduleItem)}
                  icon={<BookOpen className="size-4" />}
                  label="Kuis dan bank soal"
                />
              </div>
            </section>

            <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                <span className="inline-flex items-center gap-2">
                  <Settings className="size-4 text-teal-700" />
                  Pengaturan modul
                </span>
                <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-4 border-t border-slate-200 p-4">
                <p className="text-sm leading-6 text-slate-500">
                  Ubah identitas modul atau hapus modul jika tidak lagi digunakan.
                </p>
                <form action={updateModuleAction} className="space-y-4">
                  <input name="moduleId" type="hidden" value={data.moduleItem.id} />
                  <Field
                    defaultValue={data.moduleItem.title}
                    label="Nama modul"
                    name="title"
                    required
                  />
                  <Field
                    defaultValue={String(data.moduleItem.sortOrder)}
                    label="Urutan"
                    name="sortOrder"
                    type="number"
                  />
                  <TextArea
                    defaultValue={data.moduleItem.description ?? ""}
                    label="Deskripsi modul"
                    name="description"
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      defaultChecked={data.moduleItem.isLocked}
                      name="isLocked"
                      type="checkbox"
                    />
                    Terkunci
                  </label>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    type="submit"
                  >
                    <Save className="size-4" />
                    Simpan modul
                  </button>
                </form>
                <form action={deleteModuleAction}>
                  <input name="moduleId" type="hidden" value={data.moduleItem.id} />
                  <ConfirmSubmitButton
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    message="Hapus modul ini? Semua step dan materi di dalamnya akan ikut terhapus."
                  >
                    <Trash2 className="size-4" />
                    Hapus modul
                  </ConfirmSubmitButton>
                </form>
              </div>
            </details>
          </div>
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

function ShortcutLink({
  body,
  href,
  icon,
  label,
}: {
  body: string;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50"
      href={href}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-teal-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{body}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400" />
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
