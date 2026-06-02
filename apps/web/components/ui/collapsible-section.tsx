"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type CollapsibleTone = "neutral" | "module" | "step" | "material";

const toneStyles = {
  neutral: "border-neutral-200",
  module: "border-l-indigo-500 border-neutral-200",
  step: "border-l-teal-500 border-neutral-200",
  material: "border-l-amber-500 border-neutral-200",
} as const;

type CollapsibleSectionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  eyebrow?: string;
  meta?: ReactNode;
  summary?: ReactNode;
  title: string;
  tone?: CollapsibleTone;
};

export function CollapsibleSection({
  children,
  defaultOpen = false,
  eyebrow,
  meta,
  summary,
  title,
  tone = "neutral",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`overflow-hidden rounded-lg border border-l-4 bg-white shadow-sm ${toneStyles[tone]}`}
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-neutral-50 sm:px-5"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="min-w-0 flex-1">
          {eyebrow ? (
            <span className="text-xs font-semibold uppercase text-neutral-500">
              {eyebrow}
            </span>
          ) : null}
          <span className="mt-1 block text-base font-semibold text-neutral-950">
            {title}
          </span>
          {summary ? (
            <span className="mt-1 block text-sm leading-6 text-neutral-600">
              {summary}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {meta ? <span className="hidden sm:block">{meta}</span> : null}
          <span className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600">
            <ChevronDown
              className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
            />
          </span>
        </span>
      </button>
      {meta ? <div className="px-4 pb-3 sm:hidden">{meta}</div> : null}
      {isOpen ? <div className="border-t border-neutral-200 p-4 sm:p-5">{children}</div> : null}
    </section>
  );
}
