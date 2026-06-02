"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { notifications } from "@/db/schema";
import { requireActiveProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

export async function markNotificationReadAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const parsed = z.object({ notificationId: z.uuid() }).safeParse({
    notificationId: formData.get("notificationId"),
  });

  if (!parsed.success) {
    redirect("/notifications?error=invalid_notification");
  }

  await db
    .update(notifications)
    .set({
      readAt: new Date(),
      status: "read",
    })
    .where(
      and(
        eq(notifications.id, parsed.data.notificationId),
        eq(notifications.recipientId, profile.id),
      ),
    );

  revalidatePath("/notifications");
  redirect("/notifications?marked_read=1");
}

export async function markAllNotificationsReadAction(_formData: FormData) {
  void _formData;
  const profile = await requireActiveProfile();

  await db
    .update(notifications)
    .set({
      readAt: new Date(),
      status: "read",
    })
    .where(and(eq(notifications.recipientId, profile.id), eq(notifications.status, "unread")));

  revalidatePath("/notifications");
  redirect("/notifications?marked_all_read=1");
}
