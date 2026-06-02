import {
  ArrowLeft,
  Award,
  Bell,
  BookOpen,
  CheckCheck,
  Circle,
  ClipboardCheck,
  FileCheck2,
  Inbox,
  Megaphone,
} from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { getNotificationCenterData } from "@/features/notifications/data";
import { getDashboardPathForRole, requireActiveProfile } from "@/lib/auth";

type NotificationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type NotificationItem = Awaited<ReturnType<typeof getNotificationCenterData>>["notifications"][number];

const notificationPresentations = {
  assignment: {
    Icon: ClipboardCheck,
    label: "Tugas",
    icon: "bg-indigo-50 text-indigo-700",
  },
  certificate: {
    Icon: Award,
    label: "Sertifikat",
    icon: "bg-amber-50 text-amber-700",
  },
  class: {
    Icon: BookOpen,
    label: "Kelas",
    icon: "bg-teal-50 text-teal-700",
  },
  default: {
    Icon: Megaphone,
    label: "Aktivitas",
    icon: "bg-sky-50 text-sky-700",
  },
  quiz: {
    Icon: FileCheck2,
    label: "Kuis",
    icon: "bg-violet-50 text-violet-700",
  },
  submission: {
    Icon: FileCheck2,
    label: "Submission",
    icon: "bg-emerald-50 text-emerald-700",
  },
} as const;

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNotificationPresentation(entityType: string | null) {
  const normalizedEntityType = entityType?.toLocaleLowerCase("id-ID") ?? "";

  if (normalizedEntityType.includes("assignment")) {
    return notificationPresentations.assignment;
  }

  if (normalizedEntityType.includes("certificate")) {
    return notificationPresentations.certificate;
  }

  if (normalizedEntityType.includes("quiz")) {
    return notificationPresentations.quiz;
  }

  if (normalizedEntityType.includes("submission")) {
    return notificationPresentations.submission;
  }

  if (normalizedEntityType.includes("class") || normalizedEntityType.includes("module")) {
    return notificationPresentations.class;
  }

  return notificationPresentations.default;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const profile = await requireActiveProfile();
  const data = await getNotificationCenterData(profile.id);
  const params = await searchParams;
  const success = getSingleParam(params?.marked_read)
    ? "Notifikasi ditandai sudah dibaca."
    : getSingleParam(params?.marked_all_read)
      ? "Semua notifikasi ditandai sudah dibaca."
      : null;
  const error = getSingleParam(params?.error);
  const unreadNotifications = data.notifications.filter(
    (notification) => notification.status === "unread",
  );
  const readNotifications = data.notifications.filter(
    (notification) => notification.status !== "unread",
  );

  return (
    <DashboardShell profile={profile} title="Notifikasi">
      <div className="space-y-6 sm:space-y-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-teal-700"
          href={getDashboardPathForRole(profile.role)}
        >
          <ArrowLeft className="size-4" />
          Kembali ke dashboard
        </Link>

        {success ? (
          <DismissibleAlert title="Berhasil" tone="success">
            {success}
          </DismissibleAlert>
        ) : null}
        {error ? (
          <DismissibleAlert title="Notifikasi tidak valid" tone="danger">
            Notifikasi tidak ditemukan atau bukan milik akun ini.
          </DismissibleAlert>
        ) : null}

        <section className="overflow-hidden rounded-lg bg-[#123044] text-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[#e7b75b]">
                Pusat notifikasi
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]">
                Update aktivitas belajar
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/80">
                Pantau tugas baru, hasil verifikasi, akses resubmit, kuis, dan pembaruan kelas dari
                satu tempat.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-sky-50">
                <Bell className="size-4 text-[#e7b75b]" />
                {data.unreadCount} belum dibaca
              </span>
              <form action={markAllNotificationsReadAction}>
                <ConfirmSubmitButton
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-bold text-[#123044] transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                  message="Tandai seluruh notifikasi sebagai sudah dibaca?"
                  title="Tandai semua notifikasi sudah dibaca"
                >
                  <CheckCheck className="size-4" />
                  Tandai semua dibaca
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </section>

        {data.notifications.length > 0 ? (
          <div className="space-y-7">
            <NotificationGroup
              description="Pembaruan yang masih memerlukan perhatian Anda."
              emptyMessage="Tidak ada notifikasi baru."
              notifications={unreadNotifications}
              title="Baru untuk Anda"
              unread
            />
            <NotificationGroup
              description="Pembaruan sebelumnya yang sudah Anda baca."
              emptyMessage="Riwayat notifikasi belum tersedia."
              notifications={readNotifications}
              title="Riwayat notifikasi"
            />
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto inline-flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Inbox className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">Belum ada notifikasi</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Pembaruan tugas, kelas, dan hasil belajar akan muncul di halaman ini.
            </p>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function NotificationGroup({
  description,
  emptyMessage,
  notifications,
  title,
  unread = false,
}: {
  description: string;
  emptyMessage: string;
  notifications: NotificationItem[];
  title: string;
  unread?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            {unread ? "Perlu perhatian" : "Arsip aktivitas"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
          {notifications.length} item
        </span>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const isUnread = notification.status === "unread";
  const presentation = getNotificationPresentation(notification.entityType);
  const Icon = presentation.Icon;

  return (
    <article
      className={
        isUnread
          ? "rounded-lg border border-l-4 border-amber-200 border-l-[#e7b75b] bg-amber-50/70 p-4 shadow-sm"
          : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md ${presentation.icon}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{notification.title}</h3>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
              {presentation.label}
            </span>
            {isUnread ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-bold text-amber-700">
                <Circle className="size-2 fill-amber-500 text-amber-500" />
                Baru
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
          <p className="mt-3 text-xs font-medium text-slate-400">
            {formatDateTime(notification.createdAt)}
          </p>
        </div>

        {isUnread ? (
          <form action={markNotificationReadAction} className="shrink-0 sm:ml-auto">
            <input name="notificationId" type="hidden" value={notification.id} />
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 sm:w-fit"
              type="submit"
            >
              <CheckCheck className="size-4" />
              Tandai dibaca
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
