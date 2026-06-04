"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action="/auth/login" className="space-y-4" method="post">
      <div className="space-y-2">
        <label className="text-[13px] font-semibold leading-[18px] text-[#264b5a]" htmlFor="email">
          Email
        </label>
        <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#c7d6db] bg-white px-3.5 transition focus-within:border-[#0e7490] focus-within:ring-2 focus-within:ring-[#0e7490]/15 sm:h-[50px]">
          <Mail aria-hidden="true" className="size-[18px] shrink-0 text-[#78909a]" strokeWidth={1.8} />
          <input
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:text-[#78909a]"
            id="email"
            name="email"
            placeholder="nama@email.com"
            required
            type="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-semibold leading-[18px] text-[#264b5a]" htmlFor="password">
          Password
        </label>
        <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#c7d6db] bg-white px-3.5 transition focus-within:border-[#0e7490] focus-within:ring-2 focus-within:ring-[#0e7490]/15 sm:h-[50px]">
          <LockKeyhole
            aria-hidden="true"
            className="size-[18px] shrink-0 text-[#78909a]"
            strokeWidth={1.8}
          />
          <input
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:tracking-[0.14em] placeholder:text-[#78909a]"
            id="password"
            name="password"
            placeholder="........"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#78909a] transition hover:bg-[#f5f7f8] hover:text-[#0e7490] focus:outline-none focus:ring-2 focus:ring-[#0e7490]/20"
            onClick={() => setShowPassword((isVisible) => !isVisible)}
            title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            type="button"
          >
            {showPassword ? <EyeOff className="size-[18px]" strokeWidth={1.8} /> : <Eye className="size-[18px]" strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <SubmitButton
        className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-lg bg-[#123044] px-4 text-sm font-bold text-white transition hover:bg-[#1a4359] focus:outline-none focus:ring-2 focus:ring-[#0e7490]/30 focus:ring-offset-2"
        pendingLabel="Masuk..."
      >
        Masuk ke dashboard
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
      </SubmitButton>
    </form>
  );
}
