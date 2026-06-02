import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { AuthEditorialPanel } from "@/components/auth/auth-editorial-panel";
import { RegisterForm } from "@/features/auth/register-form";
import { getCurrentProfile, getDashboardPathForRole } from "@/lib/auth";

const errorMessages = {
  email_already_registered: "Email ini sudah pernah terdaftar. Silakan login atau gunakan email lain.",
  email_rate_limit: "Batas pengiriman email konfirmasi Supabase sedang tercapai. Tunggu beberapa menit atau matikan email confirmation untuk testing.",
  invalid_input: "Nama, email, dan password wajib valid. Password minimal 8 karakter dan konfirmasi harus sama.",
  invalid_email_address: "Alamat email tidak diterima oleh Supabase. Gunakan email asli yang valid.",
  registration_disabled: "Registrasi mahasiswa baru sedang dinonaktifkan oleh pengelola sistem.",
  register_failed: "Registrasi belum berhasil. Coba gunakan email lain atau ulangi beberapa saat lagi.",
} as const;

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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

  return (
    <main className="min-h-screen bg-[#f5f7f8] font-sans text-[#123044] lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]">
      <AuthEditorialPanel />

      <section className="flex min-h-screen items-start justify-center px-[22px] py-8 sm:px-8 sm:py-10 lg:items-center lg:px-16 xl:px-24">
        <div className="w-full max-w-[458px]">
          <div className="mb-9 lg:hidden">
            <AuthBrandMark theme="light" />
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-bold leading-4 tracking-[0.12em] text-[#0e7490] sm:text-xs sm:leading-[18px]">
              PORTAL MAHASISWA
            </p>
            <h1 className="text-3xl font-bold leading-[37px] tracking-[-0.03em] text-[#123044] sm:text-[38px] sm:leading-[46px]">
              Mulai perjalanan belajar Anda.
            </h1>
            <p className="text-sm leading-[22px] text-[#55727e] sm:text-[15px] sm:leading-6">
              Buat akun mahasiswa untuk mengakses kelas, materi, tugas, dan progres belajar dalam
              satu tempat.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="pt-6">
            <RegisterForm />
          </div>

          <p className="mt-5 text-center text-[13px] leading-[19px] text-[#55727e] sm:text-left sm:text-sm sm:leading-5">
            Sudah punya akun?{" "}
            <Link
              className="font-bold text-[#0e7490] transition hover:text-[#0a5e75] hover:underline"
              href="/login"
            >
              Masuk sekarang
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-[#78909a] sm:justify-start">
            <ShieldCheck aria-hidden="true" className="size-[15px] shrink-0" strokeWidth={1.8} />
            <p className="text-[11px] font-medium leading-4 sm:text-xs sm:leading-[18px]">
              Pendaftaran aman untuk mahasiswa EduTrack COE.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
