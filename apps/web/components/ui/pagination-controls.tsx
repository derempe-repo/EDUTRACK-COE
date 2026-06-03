import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type PaginationControlsProps = {
  currentPage: number;
  pageParam?: string;
  pageSize: number;
  searchParams?: Record<string, string | string[] | undefined>;
  totalItems: number;
};

export function PaginationControls({
  currentPage,
  pageParam = "page",
  pageSize,
  searchParams,
  totalItems,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Menampilkan <span className="font-semibold text-slate-900">{firstItem}</span>-
        <span className="font-semibold text-slate-900">{lastItem}</span> dari{" "}
        <span className="font-semibold text-slate-900">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-2">
        <PaginationLink
          disabled={currentPage <= 1}
          href={getPageHref(searchParams, pageParam, currentPage - 1)}
          label="Sebelumnya"
          icon="prev"
        />
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {currentPage} / {totalPages}
        </span>
        <PaginationLink
          disabled={currentPage >= totalPages}
          href={getPageHref(searchParams, pageParam, currentPage + 1)}
          label="Berikutnya"
          icon="next"
        />
      </div>
    </div>
  );
}

function PaginationLink({
  disabled,
  href,
  icon,
  label,
}: {
  disabled: boolean;
  href: string;
  icon: "next" | "prev";
  label: string;
}) {
  const content = (
    <>
      {icon === "prev" ? <ChevronLeft className="size-4" /> : null}
      <span>{label}</span>
      {icon === "next" ? <ChevronRight className="size-4" /> : null}
    </>
  );

  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
        {content}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
      href={href}
    >
      {content}
    </Link>
  );
}

function getPageHref(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  pageParam: string,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string" && value) {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          params.append(key, item);
        }
      }
    }
  }

  if (page <= 1) {
    params.delete(pageParam);
  } else {
    params.set(pageParam, page.toString());
  }

  const query = params.toString();
  return query ? `?${query}` : "?";
}
