"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { registerMahasiswaAction } from "@/features/auth/actions";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <form action={registerMahasiswaAction} className="space-y-3.5">
      <AuthField icon={<UserRound className="size-[18px]" strokeWidth={1.8} />} id="name" label="Nama lengkap">
        <input autoComplete="name" className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:text-[#78909a]" id="name" name="name" placeholder="Nama lengkap Anda" required type="text" />
      </AuthField>

      <AuthField icon={<Mail className="size-[18px]" strokeWidth={1.8} />} id="email" label="Email">
        <input autoComplete="email" className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:text-[#78909a]" id="email" name="email" placeholder="nama@email.com" required type="email" />
      </AuthField>

      <AuthField hint="Minimal 8 karakter" icon={<LockKeyhole className="size-[18px]" strokeWidth={1.8} />} id="password" label="Password">
        <input
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:tracking-[0.14em] placeholder:text-[#78909a]"
          id="password"
          minLength={8}
          name="password"
          placeholder="........"
          required
          type={showPassword ? "text" : "password"}
        />
        <PasswordVisibilityButton isVisible={showPassword} onToggle={() => setShowPassword((isVisible) => !isVisible)} />
      </AuthField>

      <AuthField icon={<LockKeyhole className="size-[18px]" strokeWidth={1.8} />} id="confirmPassword" label="Konfirmasi password">
        <input
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#123044] outline-none placeholder:tracking-[0.14em] placeholder:text-[#78909a]"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          placeholder="........"
          required
          type={showConfirmation ? "text" : "password"}
        />
        <PasswordVisibilityButton isVisible={showConfirmation} onToggle={() => setShowConfirmation((isVisible) => !isVisible)} />
      </AuthField>

      <button
        className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-lg bg-[#123044] px-4 text-sm font-bold text-white transition hover:bg-[#1a4359] focus:outline-none focus:ring-2 focus:ring-[#0e7490]/30 focus:ring-offset-2"
        type="submit"
      >
        Daftar
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
    </form>
  );
}

function AuthField({ children, hint, icon, id, label }: { children: ReactNode; hint?: string; icon: ReactNode; id: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-semibold leading-[18px] text-[#264b5a]" htmlFor={id}>
          {label}
        </label>
        {hint ? <p className="text-[11px] font-medium text-[#78909a]">{hint}</p> : null}
      </div>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#c7d6db] bg-white px-3.5 text-[#78909a] transition focus-within:border-[#0e7490] focus-within:ring-2 focus-within:ring-[#0e7490]/15">
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function PasswordVisibilityButton({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) {
  return (
    <button
      aria-label={isVisible ? "Sembunyikan password" : "Tampilkan password"}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#78909a] transition hover:bg-[#f5f7f8] hover:text-[#0e7490] focus:outline-none focus:ring-2 focus:ring-[#0e7490]/20"
      onClick={onToggle}
      title={isVisible ? "Sembunyikan password" : "Tampilkan password"}
      type="button"
    >
      {isVisible ? <EyeOff className="size-[18px]" strokeWidth={1.8} /> : <Eye className="size-[18px]" strokeWidth={1.8} />}
    </button>
  );
}
