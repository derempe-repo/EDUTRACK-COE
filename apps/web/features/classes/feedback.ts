export type FeedbackNotice = {
  message: string;
  title: string;
  tone: "success" | "info" | "warning" | "danger";
};

type SearchParams = Record<string, string | string[] | undefined> | undefined;

const successMessages: Record<string, FeedbackNotice> = {
  assignment_created: {
    title: "Tugas dibuat",
    message: "Tugas baru sudah tersedia pada step ini.",
    tone: "success",
  },
  certificate_ready: {
    title: "Sertifikat disiapkan",
    message: "Status kelulusan kelas sudah tersimpan sebagai draft sertifikat.",
    tone: "success",
  },
  certificate_issued: {
    title: "Sertifikat diterbitkan",
    message: "Sertifikat digital berhasil dibuat dan sekarang dapat diunduh.",
    tone: "success",
  },
  certificate_regenerated: {
    title: "PDF sertifikat diperbarui",
    message: "File sertifikat berhasil dibuat ulang tanpa mengubah nomor sertifikat dan QR token.",
    tone: "success",
  },
  export_completed: {
    title: "Export selesai",
    message: "Laporan kelas berhasil dibuat dan siap diunduh.",
    tone: "success",
  },
  assignment_deleted: {
    title: "Tugas dihapus",
    message: "Tugas berhasil dihapus karena belum memiliki submission.",
    tone: "success",
  },
  assignment_updated: {
    title: "Tugas disimpan",
    message: "Perubahan tugas sudah tersimpan dan notifikasi dikirim ke mahasiswa.",
    tone: "success",
  },
  deleted: {
    title: "Kelas dihapus",
    message: "Kelas berhasil dihapus dari daftar Anda.",
    tone: "success",
  },
  material_created: {
    title: "Materi ditambahkan",
    message: "Materi baru sudah masuk ke step yang dipilih.",
    tone: "success",
  },
  material_deleted: {
    title: "Materi dihapus",
    message: "Materi berhasil dihapus dari step ini.",
    tone: "success",
  },
  material_read: {
    title: "Materi selesai",
    message: "Materi sudah ditandai selesai dan progress kelas diperbarui.",
    tone: "success",
  },
  question_created: {
    title: "Soal ditambahkan",
    message: "Soal baru sudah masuk ke bank soal step ini.",
    tone: "success",
  },
  questions_imported: {
    title: "Bank soal diimpor",
    message: "Seluruh soal valid dari file Excel berhasil ditambahkan ke step ini.",
    tone: "success",
  },
  question_deleted: {
    title: "Soal dihapus",
    message: "Soal berhasil dihapus atau dinonaktifkan jika sudah pernah dipakai.",
    tone: "success",
  },
  quiz_created: {
    title: "Kuis dibuat",
    message: "Kuis baru sudah tersedia pada step ini.",
    tone: "success",
  },
  final_exam_created: {
    title: "Final exam dibuat",
    message: "Final exam modul sudah tersedia untuk mahasiswa yang memenuhi checklist.",
    tone: "success",
  },
  quiz_updated: {
    title: "Kuis disimpan",
    message: "Pengaturan kuis berhasil diperbarui.",
    tone: "success",
  },
  retake_opened: {
    title: "Retake dibuka",
    message: "Mahasiswa sudah bisa memulai ulang attempt yang dipilih.",
    tone: "success",
  },
  member_removed: {
    title: "Anggota dihapus",
    message: "Mahasiswa sudah dikeluarkan dari kelas.",
    tone: "success",
  },
  module_created: {
    title: "Modul dibuat",
    message: "Modul baru sudah siap dikelola. Tambahkan step dan materi dari halaman ini.",
    tone: "success",
  },
  module_deleted: {
    title: "Modul dihapus",
    message: "Modul dan konten di dalamnya sudah dihapus.",
    tone: "success",
  },
  module_updated: {
    title: "Modul disimpan",
    message: "Perubahan modul berhasil disimpan.",
    tone: "success",
  },
  saved: {
    title: "Perubahan disimpan",
    message: "Detail kelas berhasil diperbarui.",
    tone: "success",
  },
  step_created: {
    title: "Step dibuat",
    message: "Step baru sudah masuk ke modul ini.",
    tone: "success",
  },
  step_deleted: {
    title: "Step dihapus",
    message: "Step berhasil dihapus dari modul.",
    tone: "success",
  },
  step_updated: {
    title: "Step disimpan",
    message: "Perubahan step berhasil disimpan.",
    tone: "success",
  },
  student_enrolled: {
    title: "Mahasiswa ditambahkan",
    message: "Mahasiswa sudah terdaftar ke kelas ini.",
    tone: "success",
  },
  submission_reviewed: {
    title: "Submission diverifikasi",
    message: "Hasil verifikasi sudah tersimpan dan progress mahasiswa diperbarui.",
    tone: "success",
  },
  submission_submitted: {
    title: "Submission terkirim",
    message: "Tugas Anda berhasil dikumpulkan dan menunggu verifikasi dosen.",
    tone: "success",
  },
  resubmit_allowed: {
    title: "Resubmit dibuka",
    message: "Mahasiswa sudah bisa mengumpulkan ulang submission.",
    tone: "success",
  },
  plagiarism_resubmit_allowed: {
    title: "Resubmit plagiarism dibuka",
    message: "Mahasiswa dapat memperbaiki dan mengunggah ulang submission. Riwayat override sudah dicatat.",
    tone: "success",
  },
  plagiarism_rejected: {
    title: "Submission ditolak permanen",
    message: "Nilai submission menjadi 0 dan riwayat override sudah dicatat.",
    tone: "success",
  },
  plagiarism_rechecked: {
    title: "Plagiasi dicek ulang",
    message: "Hasil similarity, hash file, dan status ekstraksi submission sudah diperbarui.",
    tone: "success",
  },
};

const errorMessages: Record<string, FeedbackNotice> = {
  class_not_found: {
    title: "Kelas tidak ditemukan",
    message: "Kelas yang diminta tidak tersedia atau bukan milik akun ini.",
    tone: "danger",
  },
  class_delete_failed: {
    title: "Kelas belum bisa dihapus",
    message: "Data kelas belum berhasil dihapus. Muat ulang halaman lalu coba lagi.",
    tone: "danger",
  },
  invalid_class: {
    title: "Data kelas belum valid",
    message: "Periksa nama, deskripsi, status kelas, dan pastikan total bobot nilai tepat 100%.",
    tone: "danger",
  },
  certificate_not_ready: {
    title: "Sertifikat belum siap",
    message: "Pastikan progress 100%, nilai akhir minimal 70, dan tidak ada plagiarism rejection permanen.",
    tone: "warning",
  },
  export_failed: {
    title: "Export gagal",
    message: "File laporan belum berhasil dibuat. Coba ulangi beberapa saat lagi.",
    tone: "danger",
  },
  invalid_certificate: {
    title: "Sertifikat tidak valid",
    message: "Data sertifikat tidak lengkap atau tidak dapat diproses.",
    tone: "danger",
  },
  invalid_export: {
    title: "Export tidak valid",
    message: "Format export atau kelas yang dipilih tidak valid.",
    tone: "danger",
  },
  invalid_enrollment: {
    title: "Enrollment belum valid",
    message: "Pastikan email mahasiswa diisi dengan benar.",
    tone: "danger",
  },
  invalid_material: {
    title: "Materi belum lengkap",
    message: "Isi judul dan sediakan URL atau file sesuai tipe materi.",
    tone: "danger",
  },
  invalid_material_file: {
    title: "File materi tidak sesuai",
    message: "Gunakan file LMS yang didukung: PDF, Word, TXT/MD, ZIP/RAR, file kode, atau dokumen belajar lainnya.",
    tone: "danger",
  },
  invalid_material_url: {
    title: "URL materi tidak valid",
    message: "Pastikan URL diawali dengan protokol seperti https://.",
    tone: "danger",
  },
  invalid_material_read: {
    title: "Materi belum valid",
    message: "Materi tidak bisa ditandai selesai. Muat ulang halaman lalu coba lagi.",
    tone: "danger",
  },
  invalid_assignment: {
    title: "Data tugas belum valid",
    message: "Periksa judul, tenggat, dan nilai maksimal tugas.",
    tone: "danger",
  },
  invalid_assignment_file: {
    title: "File tugas tidak sesuai",
    message: "Lampiran tugas dapat berupa PDF, Word, TXT/MD, ZIP/RAR, HTML/CSS, file kode, atau dokumen LMS lain maksimal 25 MB.",
    tone: "danger",
  },
  invalid_submission: {
    title: "Submission belum lengkap",
    message: "Pilih file dan isi catatan jika diperlukan sebelum mengirim.",
    tone: "danger",
  },
  invalid_submission_file: {
    title: "File submission tidak sesuai",
    message: "Gunakan PDF, Word, TXT/MD, ZIP/RAR, HTML/CSS, file kode, atau dokumen LMS lain maksimal 50 MB.",
    tone: "danger",
  },
  invalid_submission_review: {
    title: "Review belum valid",
    message: "Periksa status, nilai, dan feedback sebelum menyimpan verifikasi.",
    tone: "danger",
  },
  invalid_submission_score: {
    title: "Nilai tidak valid",
    message: "Nilai tidak boleh melebihi nilai maksimal tugas.",
    tone: "danger",
  },
  invalid_module: {
    title: "Data modul belum valid",
    message: "Periksa nama modul dan urutan sebelum menyimpan.",
    tone: "danger",
  },
  invalid_question: {
    title: "Data soal belum valid",
    message: "Isi pertanyaan, empat pilihan, jawaban benar, difficulty, dan bobot soal.",
    tone: "danger",
  },
  invalid_question_import: {
    title: "Import soal belum valid",
    message: "Data import tidak dapat diproses. Buat ulang preview dari template Excel lalu coba lagi.",
    tone: "danger",
  },
  question_import_duplicate: {
    title: "Ada soal duplikat",
    message: "Satu atau beberapa pertanyaan sudah ada di bank soal. Buat ulang preview dan periksa baris yang ditandai.",
    tone: "warning",
  },
  invalid_quiz: {
    title: "Data kuis belum valid",
    message: "Periksa nama, durasi, jumlah soal, dan passing score kuis.",
    tone: "danger",
  },
  invalid_quiz_submission: {
    title: "Jawaban kuis belum valid",
    message: "Pastikan semua soal sudah dijawab sebelum mengirim kuis.",
    tone: "danger",
  },
  invalid_step: {
    title: "Data step belum valid",
    message: "Periksa nama step dan urutan sebelum menyimpan.",
    tone: "danger",
  },
  material_upload_failed: {
    title: "Upload gagal",
    message: "File belum berhasil diunggah. Coba ulangi dengan file yang sama atau lebih kecil.",
    tone: "danger",
  },
  assignment_upload_failed: {
    title: "Upload tugas gagal",
    message: "File tugas belum berhasil diunggah. Coba ulangi dengan file PDF yang sama atau lebih kecil.",
    tone: "danger",
  },
  member_not_found: {
    title: "Anggota tidak ditemukan",
    message: "Anggota yang dipilih tidak ada di kelas ini.",
    tone: "danger",
  },
  module_not_found: {
    title: "Modul tidak ditemukan",
    message: "Modul yang diminta tidak tersedia untuk kelas ini.",
    tone: "danger",
  },
  question_not_found: {
    title: "Soal tidak ditemukan",
    message: "Soal tidak tersedia atau bukan bagian dari kelas Anda.",
    tone: "danger",
  },
  quiz_attempt_expired: {
    title: "Attempt kuis berakhir",
    message: "Kuis tidak bisa dikirim karena waktu habis atau attempt sudah tidak aktif.",
    tone: "warning",
  },
  quiz_attempt_not_found: {
    title: "Attempt kuis tidak ditemukan",
    message: "Attempt kuis tidak tersedia untuk akun ini.",
    tone: "danger",
  },
  quiz_already_exists: {
    title: "Kuis step sudah ada",
    message: "Setiap step hanya boleh memiliki satu kuis utama. Edit kuis yang sudah ada jika perlu perubahan.",
    tone: "warning",
  },
  final_exam_already_exists: {
    title: "Final exam sudah ada",
    message: "Setiap modul hanya memiliki satu final exam aktif. Edit final exam yang sudah ada jika perlu perubahan.",
    tone: "warning",
  },
  final_exam_locked: {
    title: "Final exam belum terbuka",
    message: "Selesaikan tugas dan kuis step terlebih dahulu sebelum memulai final exam.",
    tone: "warning",
  },
  quiz_not_enough_questions: {
    title: "Soal belum cukup",
    message: "Kuis belum bisa dimulai karena bank soal aktif belum memenuhi jumlah soal kuis.",
    tone: "warning",
  },
  quiz_not_found: {
    title: "Kuis tidak ditemukan",
    message: "Kuis tidak tersedia atau Anda tidak memiliki akses.",
    tone: "danger",
  },
  assignment_not_found: {
    title: "Tugas tidak ditemukan",
    message: "Tugas tidak tersedia atau Anda tidak memiliki akses.",
    tone: "danger",
  },
  assignment_has_submissions: {
    title: "Tugas belum bisa dihapus",
    message: "Tugas sudah memiliki submission. Nonaktifkan tugas jika tidak ingin terlihat oleh mahasiswa.",
    tone: "warning",
  },
  assignment_due_passed: {
    title: "Tenggat sudah lewat",
    message: "Submission tidak dapat dikirim setelah tenggat, kecuali dosen membuka resubmit.",
    tone: "warning",
  },
  submission_locked: {
    title: "Submission belum bisa diganti",
    message: "Submission masih menunggu review atau sudah diterima. Minta dosen membuka resubmit jika perlu.",
    tone: "danger",
  },
  submission_not_found: {
    title: "Submission tidak ditemukan",
    message: "Submission tidak tersedia atau bukan bagian dari kelas Anda.",
    tone: "danger",
  },
  submission_upload_failed: {
    title: "Upload submission gagal",
    message: "File belum berhasil diunggah. Coba ulangi dengan file yang sama atau lebih kecil.",
    tone: "danger",
  },
  invalid_plagiarism_override: {
    title: "Override belum valid",
    message: "Tuliskan alasan override minimal 10 karakter sebelum menyimpan keputusan.",
    tone: "danger",
  },
  plagiarism_check_not_found: {
    title: "Hasil cek tidak ditemukan",
    message: "Hasil plagiarism tidak tersedia atau Anda tidak memiliki akses untuk mengubahnya.",
    tone: "danger",
  },
  plagiarism_file_download_failed: {
    title: "File submission belum bisa dibaca",
    message: "File di storage belum bisa diambil untuk cek ulang. Coba ulangi beberapa saat lagi.",
    tone: "danger",
  },
  plagiarism_module_locked: {
    title: "Modul terkunci sementara",
    message: "Submission pada modul sebelumnya perlu ditinjau dosen sebelum Anda dapat melanjutkan.",
    tone: "warning",
  },
  plagiarism_override_required: {
    title: "Gunakan override plagiarism",
    message: "Submission yang ditandai similarity harus diproses melalui Izinkan Ulang Upload atau Tolak Permanen.",
    tone: "warning",
  },
  step_not_found: {
    title: "Step tidak ditemukan",
    message: "Step yang diminta tidak tersedia untuk modul ini.",
    tone: "danger",
  },
  student_not_found: {
    title: "Mahasiswa tidak ditemukan",
    message: "Email tersebut belum terdaftar sebagai mahasiswa aktif.",
    tone: "danger",
  },
};

export function getFeedbackNotice(searchParams: SearchParams): FeedbackNotice | null {
  const error = getSingleParam(searchParams?.error);

  if (error && errorMessages[error]) {
    return errorMessages[error];
  }

  for (const [key, notice] of Object.entries(successMessages)) {
    if (getSingleParam(searchParams?.[key])) {
      return notice;
    }
  }

  return null;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
