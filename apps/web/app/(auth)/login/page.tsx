import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { AuthEditorialPanel } from "@/components/auth/auth-editorial-panel";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentProfile, getDashboardPathForRole } from "@/lib/auth";

const errorMessages = {
  invalid_input: "Email dan password wajib diisi dengan format yang benar.",
  invalid_credentials: "Email atau password tidak sesuai.",
  email_not_confirmed: "Email belum dikonfirmasi. Cek inbox atau spam, lalu klik link konfirmasi dari Supabase.",
  inactive: "Akun Anda sedang nonaktif. Hubungi admin.",
  profile_not_found: "Profil aplikasi belum dibuat untuk akun ini.",
  confirm_failed: "Konfirmasi email tidak valid atau sudah kedaluwarsa.",
} as const;

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    registered?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getCurrentProfile();

  if (profile?.status === "active") {
    redirect(getDashboardPathForRole(profile.role));
  }

  const params = await searchParams;
  const errorKey = params?.error;
  const errorMessage =
    errorKey && errorKey in errorMessages
      ? errorMessages[errorKey as keyof typeof errorMessages]
      : null;
  const isRegistered = params?.registered === "1";

  return (
    <main className="min-h-screen bg-[#f5f7f8] font-sans text-[#123044] lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]">
      <AuthEditorialPanel />

      <section className="flex min-h-screen items-start justify-center px-[22px] py-8 sm:items-center sm:px-8 lg:px-16 xl:px-24">
        <div className="w-full max-w-[458px]">
          <div className="mb-11 lg:hidden">
            <AuthBrandMark theme="light" />
          </div>

          <div className="space-y-2.5 sm:space-y-3.5">
            <p className="text-[11px] font-bold leading-4 tracking-[0.12em] text-[#0e7490] sm:text-xs sm:leading-[18px]">
              PORTAL PEMBELAJARAN
            </p>
            <h2 className="text-3xl font-bold leading-[37px] tracking-[-0.03em] text-[#123044] sm:text-[38px] sm:leading-[46px]">
              Selamat datang kembali.
            </h2>
            <p className="text-sm leading-[22px] text-[#55727e] sm:text-[15px] sm:leading-6">
              <span className="sm:hidden">Masuk untuk melanjutkan progres belajar Anda.</span>
              <span className="hidden sm:inline">
                Masuk untuk melanjutkan materi, tugas, dan pencapaian belajar Anda.
              </span>
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-5">
              <DismissibleAlert title="Login belum berhasil" tone="danger">
              {errorMessage}
              </DismissibleAlert>
            </div>
          ) : null}
          {isRegistered ? (
            <div className="mt-5">
              <DismissibleAlert title="Registrasi berhasil" tone="success">
                Jika konfirmasi email aktif, cek inbox Anda sebelum login.
              </DismissibleAlert>
            </div>
          ) : null}

          <div className="pt-[30px] sm:pt-9">
            <LoginForm />
          </div>

          <p className="mt-[21px] text-center text-[13px] leading-[19px] text-[#55727e] sm:mt-6 sm:text-left sm:text-sm sm:leading-5">
            <span className="sm:hidden">Belum punya akun?</span>
            <span className="hidden sm:inline">Belum punya akun mahasiswa?</span>{" "}
            <Link
              className="font-bold text-[#0e7490] transition hover:text-[#0a5e75] hover:underline"
              href="/register"
            >
              Daftar sekarang
            </Link>
          </p>

          <div className="mt-[70px] flex items-center justify-center gap-2 text-[#78909a] sm:mt-13 sm:justify-start">
            <ShieldCheck aria-hidden="true" className="size-[15px] shrink-0" strokeWidth={1.8} />
            <p className="text-[11px] font-medium leading-4 sm:text-xs sm:leading-[18px]">
              <span className="sm:hidden">Akses aman untuk akun EduTrack COE.</span>
              <span className="hidden sm:inline">Akses aman untuk akun terdaftar EduTrack COE.</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
