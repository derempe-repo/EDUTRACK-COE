"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type ConfirmSubmitButtonProps = {
  cancelLabel?: string;
  children: ReactNode;
  className?: string;
  confirmLabel?: string;
  message: string;
  title?: string;
  tone?: "danger" | "default";
};

export function ConfirmSubmitButton({
  cancelLabel = "Batal",
  children,
  className,
  confirmLabel,
  message,
  title,
  tone,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isOpen, setIsOpen] = useState(false);
  const bypassConfirmationRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  const resolvedTone = tone ?? getToneFromMessage(message);
  const isDanger = resolvedTone === "danger";
  const resolvedTitle = title ?? (isDanger ? "Konfirmasi tindakan" : "Lanjutkan aksi ini?");
  const resolvedConfirmLabel = confirmLabel ?? (isDanger ? "Ya, lanjutkan" : "Lanjutkan");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => confirmButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const submitAfterConfirmation = () => {
    const form = buttonRef.current?.form;
    bypassConfirmationRef.current = true;
    setIsOpen(false);

    if (form && buttonRef.current) {
      form.requestSubmit(buttonRef.current);
    }
  };

  return (
    <>
      <button
        aria-busy={pending}
        className={cn(className, "disabled:cursor-wait disabled:opacity-70")}
        disabled={pending}
        onClick={(event) => {
          if (bypassConfirmationRef.current) {
            bypassConfirmationRef.current = false;
            return;
          }

          event.preventDefault();
          setIsOpen(true);
        }}
        ref={buttonRef}
        title={title}
        type="submit"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Memproses
          </span>
        ) : (
          children
        )}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-[2px] sm:items-center"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setIsOpen(false);
            }
          }}
        >
          <div
            aria-describedby={messageId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="modal-enter w-full max-w-md rounded-2xl border border-white/70 bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ${
                  isDanger
                    ? "bg-red-50 text-red-600 ring-red-100"
                    : "bg-teal-50 text-teal-700 ring-teal-100"
                }`}
              >
                {isDanger ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-6 text-slate-950" id={titleId}>
                  {resolvedTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600" id={messageId}>
                  {message}
                </p>
              </div>
              <button
                aria-label="Tutup dialog"
                className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 ${
                  isDanger
                    ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-200"
                    : "bg-[#123044] hover:bg-[#1a425b] focus-visible:ring-teal-200"
                }`}
                onClick={submitAfterConfirmation}
                ref={confirmButtonRef}
                type="button"
              >
                {resolvedConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getToneFromMessage(message: string): "danger" | "default" {
  return /hapus|keluarkan|tolak|permanen|cabut|reset|arsip|gagal/i.test(message)
    ? "danger"
    : "default";
}
