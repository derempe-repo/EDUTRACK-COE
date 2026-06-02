import Image from "next/image";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";

export function AuthEditorialPanel() {
  return (
    <section className="hidden min-h-screen flex-col justify-between overflow-hidden bg-[#123044] px-12 py-14 lg:flex xl:px-16">
      <AuthBrandMark theme="dark" />

      <div className="max-w-[610px] space-y-5">
        <p className="text-xs font-bold leading-[18px] tracking-[0.14em] text-[#e7b75b]">
          BELAJAR DENGAN ARAH YANG JELAS
        </p>
        <p className="max-w-[610px] text-[clamp(3rem,4.03vw,3.625rem)] font-bold leading-[1.1] tracking-[-0.035em] text-white">
          Satu ruang untuk terus bertumbuh.
        </p>
        <p className="max-w-[540px] text-[17px] leading-7 text-[#c8d8de]">
          Akses materi, selesaikan tugas, dan lihat kemajuan belajar Anda dalam alur yang lebih
          tenang dan terarah.
        </p>
      </div>

      <div className="relative h-[190px] overflow-hidden rounded-[14px] border border-[#dce7ea]/20 bg-[#264b5a]">
        <Image
          alt="Mahasiswa belajar bersama menggunakan laptop di perpustakaan kampus"
          className="object-cover"
          fill
          priority
          sizes="55vw"
          src="/images/edutrack-login-academic.png"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#123044]/90 to-transparent px-5 pb-[18px] pt-14">
          <p className="text-[13px] font-semibold leading-[18px] tracking-[0.06em] text-white">
            RUANG UNTUK BELAJAR DAN BERTUMBUH
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="h-px w-7 bg-[#e7b75b]" />
        <p className="text-xs font-medium leading-[18px] tracking-[0.06em] text-[#afc7d1]">
          BELAJAR / BERLATIH / BERTUMBUH
        </p>
      </div>
    </section>
  );
}
