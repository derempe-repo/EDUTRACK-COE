import { Award, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";

import { verifyCertificateToken } from "@/features/certificates/verification";
import { formatAppDate } from "@/lib/app-time";

type VerifyCertificatePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function VerifyCertificatePage({ params }: VerifyCertificatePageProps) {
  const { token } = await params;
  const { certificate, result } = await verifyCertificateToken(token);

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#123044] px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7b75b] text-[#123044]">
                <Award className="size-6" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-wide text-white">EduTrack COE</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-sky-100/70">
                  Certificate of Excellence
                </p>
              </div>
            </div>
            <span className="w-fit rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-50">
              Verifikasi publik
            </span>
          </div>

          <div className="mt-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
              Sertifikat digital
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
              Verifikasi keaslian sertifikat
            </h1>
            <p className="mt-3 text-sm leading-6 text-sky-100/80">
              Status pada halaman ini diambil langsung dari catatan penerbitan EduTrack COE.
            </p>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          {result === "valid" && certificate ? (
            <>
              <StatusBanner
                description="Nomor sertifikat dan QR code cocok dengan sertifikat digital resmi yang tersimpan pada sistem."
                icon={<CheckCircle2 className="size-5" />}
                title="Sertifikat valid"
                tone="success"
              />
              <CertificateDetail
                certificateNumber={certificate.certificateNumber ?? "-"}
                classTitle={certificate.classTitle}
                issuedAt={formatAppDate(certificate.issuedAt, { dateStyle: "long" })}
                studentName={certificate.studentName}
              />
            </>
          ) : result === "revoked" && certificate ? (
            <>
              <StatusBanner
                description="Sertifikat ditemukan, tetapi telah dicabut oleh administrator dan tidak lagi berlaku."
                icon={<ShieldAlert className="size-5" />}
                title="Sertifikat dicabut"
                tone="warning"
              />
              <CertificateDetail
                certificateNumber={certificate.certificateNumber ?? "-"}
                classTitle={certificate.classTitle}
                issuedAt={formatAppDate(certificate.issuedAt, { dateStyle: "long" })}
                studentName={certificate.studentName}
              />
            </>
          ) : (
            <StatusBanner
              description="Token verifikasi tidak ditemukan. Periksa kembali QR code atau tautan yang digunakan."
              icon={<XCircle className="size-5" />}
              title="Sertifikat tidak ditemukan"
              tone="danger"
            />
          )}

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
              Keaslian sertifikat diperiksa melalui token unik pada sistem EduTrack COE.
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/">
              Kembali ke EduTrack COE
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CertificateDetail({
  certificateNumber,
  classTitle,
  issuedAt,
  studentName,
}: {
  certificateNumber: string;
  classTitle: string;
  issuedAt: string;
  studentName: string;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-5 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 sm:p-6">
      <Detail label="Nama mahasiswa" value={studentName} />
      <Detail label="Nama kelas" value={classTitle} />
      <Detail label="Nomor sertifikat" value={certificateNumber} />
      <Detail label="Tanggal terbit" value={issuedAt} />
    </dl>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function StatusBanner({
  description,
  icon,
  title,
  tone,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
  tone: "danger" | "success" | "warning";
}) {
  const toneClasses = {
    danger: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-lg border p-4 sm:p-5 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}
