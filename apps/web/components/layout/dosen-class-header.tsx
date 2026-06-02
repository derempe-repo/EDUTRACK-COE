import { BookOpen, Layers, Users } from "lucide-react";

type DosenClassHeaderProps = {
  classItem: {
    description: string | null;
    status: "archived" | "draft" | "published";
    title: string;
  };
  moduleCount: number;
  stepCount: number;
  studentCount: number;
};

const statusLabels = {
  archived: "Archived",
  draft: "Draft",
  published: "Published",
} as const;

export function DosenClassHeader({
  classItem,
  moduleCount,
  stepCount,
  studentCount,
}: DosenClassHeaderProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#123044] px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">Detail kelas</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]">{classItem.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/80">
              {classItem.description ?? "Belum ada deskripsi kelas."}
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-50">
            {statusLabels[classItem.status]}
          </span>
        </div>
      </div>
      <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
        <OverviewStat icon={<Layers className="size-4" />} label="Modul" value={moduleCount} />
        <OverviewStat icon={<BookOpen className="size-4" />} label="Step" value={stepCount} />
        <OverviewStat icon={<Users className="size-4" />} label="Mahasiswa" value={studentCount} />
      </div>
    </section>
  );
}

function OverviewStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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
