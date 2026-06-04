import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

function SkeletonCard({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      {children}
    </div>
  );
}

export function DashboardRouteLoading() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#123044]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col bg-[#123044] text-white lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-28 rounded bg-white/80" />
            <div className="mt-2 h-2.5 w-32 rounded bg-white/25" />
          </div>
        </div>

        <div className="px-7 pb-3 pt-6">
          <div className="h-2.5 w-20 rounded bg-white/25" />
        </div>
        <div className="space-y-2 px-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="flex items-center gap-3 rounded-md px-3 py-2.5" key={index}>
              <div className="size-4 rounded bg-white/25" />
              <div className="h-3 w-28 rounded bg-white/25" />
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-white/20" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-28 rounded bg-white/35" />
              <div className="mt-2 h-2.5 w-16 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="hidden min-w-0 lg:block">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-2 h-4 w-48" />
            </div>

            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-1.5 h-2.5 w-28" />
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <SkeletonBlock className="hidden h-9 w-28 sm:block" />
              <SkeletonBlock className="size-9 rounded-full" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
          <div className="space-y-6">
            <section className="space-y-3">
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-8 w-full max-w-md" />
              <SkeletonBlock className="h-4 w-full max-w-2xl" />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonCard key={index}>
                  <SkeletonBlock className="size-9 rounded-full" />
                  <SkeletonBlock className="mt-5 h-3 w-24" />
                  <SkeletonBlock className="mt-3 h-7 w-20" />
                </SkeletonCard>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <SkeletonCard className="space-y-4">
                <SkeletonBlock className="h-5 w-44" />
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4" key={index}>
                    <SkeletonBlock className="size-10 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-3.5 w-2/3" />
                      <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                    <SkeletonBlock className="h-8 w-20" />
                  </div>
                ))}
              </SkeletonCard>

              <SkeletonCard className="space-y-4">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
              </SkeletonCard>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthRouteLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7f8] font-sans text-[#123044] lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]">
      <section className="hidden min-h-screen bg-[#123044] p-16 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-600">
            <BookOpen className="size-5" />
          </span>
          <div>
            <div className="h-3.5 w-28 rounded bg-white/85" />
            <div className="mt-2 h-2.5 w-24 rounded bg-white/30" />
          </div>
        </div>
        <div className="mt-28 space-y-5">
          <div className="h-3 w-48 rounded bg-[#e7b75b]" />
          <div className="h-14 w-full max-w-xl rounded bg-white/80" />
          <div className="h-14 w-full max-w-md rounded bg-white/80" />
          <div className="h-5 w-full max-w-lg rounded bg-white/35" />
        </div>
        <div className="mt-auto h-40 rounded-lg bg-white/12" />
      </section>

      <section className="flex min-h-screen items-start justify-center px-[22px] py-8 sm:items-center sm:px-8 lg:px-16 xl:px-24">
        <div className="w-full max-w-[458px]">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-600 text-white">
                <BookOpen className="size-5" />
              </span>
              <div>
                <SkeletonBlock className="h-3.5 w-28" />
                <SkeletonBlock className="mt-2 h-2.5 w-24" />
              </div>
            </div>
          </div>
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="mt-5 h-10 w-full max-w-sm" />
          <SkeletonBlock className="mt-3 h-5 w-full" />
          <div className="mt-8 space-y-5">
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
          <SkeletonBlock className="mx-auto mt-7 h-4 w-52 sm:mx-0" />
        </div>
      </section>
    </main>
  );
}

export function PublicRouteLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7f8] px-4 py-8 text-[#123044] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-600 text-white">
            <BookOpen className="size-5" />
          </span>
          <div>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-2 h-3 w-40" />
          </div>
        </div>
        <SkeletonCard className="space-y-5">
          <SkeletonBlock className="h-10 w-full max-w-md" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
          <SkeletonBlock className="h-40 w-full" />
        </SkeletonCard>
      </div>
    </main>
  );
}
