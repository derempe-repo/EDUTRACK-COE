export function getAdminFeedbackNotice(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const error = getSingleParam(searchParams?.error);

  if (error === "invalid_profile_update") {
    return { message: "Data role atau status user tidak valid.", title: "Perubahan ditolak", tone: "danger" as const };
  }

  if (error === "profile_update_forbidden") {
    return { message: "Akun ini tidak boleh diubah oleh role Anda atau merupakan akun Anda sendiri.", title: "Akses dibatasi", tone: "warning" as const };
  }

  if (error === "profile_not_found") {
    return { message: "User yang dipilih sudah tidak tersedia.", title: "User tidak ditemukan", tone: "danger" as const };
  }

  if (getSingleParam(searchParams?.profile_updated)) {
    return { message: "Role dan status user berhasil diperbarui.", title: "User diperbarui", tone: "success" as const };
  }

  if (getSingleParam(searchParams?.settings_updated)) {
    return { message: "Pengaturan sistem berhasil diperbarui.", title: "Pengaturan disimpan", tone: "success" as const };
  }

  if (error === "invalid_settings") {
    return { message: "Periksa kembali nilai pengaturan sebelum menyimpan.", title: "Pengaturan belum valid", tone: "danger" as const };
  }

  return null;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
