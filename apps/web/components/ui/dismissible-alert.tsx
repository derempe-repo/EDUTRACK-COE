"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type AlertTone = "success" | "info" | "warning" | "danger";

const toneStyles = {
  success: {
    root: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: "text-emerald-600",
    button: "text-emerald-700 hover:bg-emerald-100",
    Icon: CheckCircle2,
  },
  info: {
    root: "border-sky-200 bg-sky-50 text-sky-950",
    icon: "text-sky-600",
    button: "text-sky-700 hover:bg-sky-100",
    Icon: Info,
  },
  warning: {
    root: "border-amber-200 bg-amber-50 text-amber-950",
    icon: "text-amber-600",
    button: "text-amber-700 hover:bg-amber-100",
    Icon: AlertTriangle,
  },
  danger: {
    root: "border-red-200 bg-red-50 text-red-950",
    icon: "text-red-600",
    button: "text-red-700 hover:bg-red-100",
    Icon: AlertTriangle,
  },
} as const;

type DismissibleAlertProps = {
  children: ReactNode;
  title: string;
  tone?: AlertTone;
};

export function DismissibleAlert({
  children,
  title,
  tone = "info",
}: DismissibleAlertProps) {
  const [isOpen, setIsOpen] = useState(true);
  const styles = toneStyles[tone];
  const Icon = styles.Icon;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={`flex gap-3 rounded-lg border p-4 shadow-sm ${styles.root}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-sm leading-6 opacity-85">{children}</div>
      </div>
      <button
        aria-label="Tutup notifikasi"
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md transition ${styles.button}`}
        onClick={() => setIsOpen(false)}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
