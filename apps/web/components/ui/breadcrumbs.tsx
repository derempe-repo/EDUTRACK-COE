import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-neutral-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex min-w-0 items-center gap-1" key={`${item.label}-${index}`}>
              {index > 0 ? <ChevronRight className="size-4 shrink-0 text-neutral-400" /> : null}
              {index === 0 ? <Home className="size-4 shrink-0 text-neutral-400" /> : null}
              {item.href && !isLast ? (
                <Link
                  className="max-w-52 truncate rounded-md px-1.5 py-1 font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="max-w-64 truncate rounded-md px-1.5 py-1 font-semibold text-neutral-950"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
