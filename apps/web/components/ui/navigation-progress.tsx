"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MAX_WAIT_MS = 10_000;

function shouldStartNavigationFeedback(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  const samePathAndSearch =
    nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search;
  const onlyHashChanges = samePathAndSearch && nextUrl.hash !== currentUrl.hash;

  return !onlyHashChanges && nextUrl.href !== currentUrl.href;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!isNavigatingRef.current) {
      return;
    }

    clearTimers();
    isNavigatingRef.current = false;
    document.documentElement.removeAttribute("data-navigation-pending");
    setProgress(100);
    window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 180);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    isNavigatingRef.current = true;
    document.documentElement.setAttribute("data-navigation-pending", "true");
    setIsVisible(true);
    setProgress(12);

    intervalRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) {
          return current;
        }

        return current + Math.max(1, Math.round((90 - current) * 0.08));
      });
    }, 180);

    timeoutRef.current = window.setTimeout(finish, MAX_WAIT_MS);
  }, [clearTimers, finish]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (shouldStartNavigationFeedback(anchor, event)) {
        start();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimers();
      document.documentElement.removeAttribute("data-navigation-pending");
    };
  }, [clearTimers, start]);

  useEffect(() => {
    finish();
  }, [finish, pathname]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 bg-transparent"
    >
      <div
        className="h-full origin-left bg-teal-500 shadow-[0_0_14px_rgba(20,184,166,0.65)] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
