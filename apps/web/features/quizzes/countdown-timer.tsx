"use client";

import { useEffect, useState } from "react";

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function CountdownTimer({
  attemptId,
  expiresAtMs,
  initialRemainingMs,
}: {
  attemptId?: string;
  expiresAtMs: number;
  initialRemainingMs: number;
}) {
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);
  const [hasExpired, setHasExpired] = useState(initialRemainingMs <= 0);

  useEffect(() => {
    let didRequestExpire = false;

    const updateRemainingTime = () => {
      const nextRemainingMs = Math.max(0, expiresAtMs - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !didRequestExpire) {
        didRequestExpire = true;
        setHasExpired(true);

        if (attemptId) {
          void fetch(`/api/quiz-attempts/${attemptId}/expire`, {
            method: "POST",
          }).finally(() => {
            window.location.reload();
          });
        }
      }
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [attemptId, expiresAtMs]);

  const isAlmostExpired = remainingMs > 0 && remainingMs <= 60_000;
  const isExpired = remainingMs <= 0;

  return (
    <span
      className={
        isExpired
          ? "text-red-700"
          : isAlmostExpired
            ? "text-amber-700"
            : "text-neutral-950"
      }
    >
      {formatRemainingTime(remainingMs)}
      {hasExpired ? <span className="sr-only"> Waktu habis</span> : null}
    </span>
  );
}
