"use client";

import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type AlertTone = "success" | "info" | "warning" | "danger";

const toneStyles = {
  success: {
    root: "border-emerald-200/80 bg-white text-emerald-950 shadow-emerald-950/5",
    accent: "bg-emerald-500",
    iconShell: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    button: "text-emerald-700 hover:bg-emerald-50",
    Icon: CheckCircle2,
  },
  info: {
    root: "border-sky-200/80 bg-white text-sky-950 shadow-sky-950/5",
    accent: "bg-sky-500",
    iconShell: "bg-sky-50 text-sky-600 ring-sky-100",
    button: "text-sky-700 hover:bg-sky-50",
    Icon: Info,
  },
  warning: {
    root: "border-amber-200/80 bg-white text-amber-950 shadow-amber-950/5",
    accent: "bg-amber-500",
    iconShell: "bg-amber-50 text-amber-600 ring-amber-100",
    button: "text-amber-700 hover:bg-amber-50",
    Icon: AlertTriangle,
  },
  danger: {
    root: "border-red-200/80 bg-white text-red-950 shadow-red-950/5",
    accent: "bg-red-500",
    iconShell: "bg-red-50 text-red-600 ring-red-100",
    button: "text-red-700 hover:bg-red-50",
    Icon: ShieldAlert,
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
      className={`alert-enter relative overflow-hidden rounded-xl border shadow-sm ${styles.root}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} />
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
        <span
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ${styles.iconShell}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-5">{title}</p>
          <div className="mt-1 text-sm leading-6 text-slate-600">{children}</div>
        </div>
        <button
          aria-label="Tutup notifikasi"
          className={`-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${styles.button}`}
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
