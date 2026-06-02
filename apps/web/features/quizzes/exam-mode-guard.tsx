"use client";

import { AlertTriangle, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExamModeGuardProps = {
  attemptId: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export function ExamModeGuard({ attemptId, children, disabled = false }: ExamModeGuardProps) {
  const [isReady, setIsReady] = useState(disabled);
  const [warningCount, setWarningCount] = useState(0);
  const hiddenAtRef = useRef<number | null>(null);
  const endpoint = useMemo(() => `/api/quiz-attempts/${attemptId}/events`, [attemptId]);

  const recordEvent = useCallback(async (eventType: string, detail?: string) => {
    if (disabled) {
      return;
    }

    const response = await fetch(endpoint, {
      body: JSON.stringify({ detail, eventType }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      reset?: boolean;
      warningCount?: number;
    } | null;

    if (payload?.warningCount !== undefined) {
      setWarningCount(payload.warningCount);
    }

    if (payload?.reset) {
      window.location.reload();
    }
  }, [disabled, endpoint]);

  async function enterFullscreen() {
    await document.documentElement.requestFullscreen?.().catch(() => undefined);
    setIsReady(true);
  }

  useEffect(() => {
    if (disabled) {
      return;
    }

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent("copy", "Copy diblokir pada halaman kuis.");
    };
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent("paste", "Paste diblokir pada halaman kuis.");
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isReady) {
        void recordEvent("fullscreen_exit", "Mahasiswa keluar dari fullscreen.");
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > 10_000) {
        void recordEvent("visibility_hidden", "Tab tidak aktif lebih dari 10 detik.");
      }

      hiddenAtRef.current = null;
    };
    const onBeforeUnload = () => {
      navigator.sendBeacon?.(
        endpoint,
        new Blob(
          [
            JSON.stringify({
              detail: "Mahasiswa meninggalkan halaman kuis.",
              eventType: "route_leave",
            }),
          ],
          { type: "application/json" },
        ),
      );
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [disabled, endpoint, isReady, recordEvent]);

  if (!isReady) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold uppercase text-amber-800">
              <AlertTriangle className="size-4" />
              Exam mode
            </div>
            <h2 className="mt-4 text-xl font-semibold text-amber-950">
              Masuk fullscreen untuk mulai kuis
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900">
              Selama kuis, copy, paste, pindah tab terlalu lama, dan keluar fullscreen akan dicatat
              sebagai warning.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={enterFullscreen}
            type="button"
          >
            <Maximize2 className="size-4" />
            Mulai fullscreen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!disabled && warningCount > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Warning exam mode: {warningCount}/3.
        </div>
      ) : null}
      {children}
    </div>
  );
}
