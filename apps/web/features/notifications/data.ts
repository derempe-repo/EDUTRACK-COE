import { and, desc, eq, sql } from "drizzle-orm";

import { notifications } from "@/db/schema";
import { db } from "@/lib/db";

export async function getNotificationCenterData(profileId: string) {
  const rows = await db
    .select({
      body: notifications.body,
      createdAt: notifications.createdAt,
      entityId: notifications.entityId,
      entityType: notifications.entityType,
      id: notifications.id,
      readAt: notifications.readAt,
      status: notifications.status,
      title: notifications.title,
    })
    .from(notifications)
    .where(eq(notifications.recipientId, profileId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unreadCount = rows.filter((notification) => notification.status === "unread").length;

  return {
    notifications: rows,
    unreadCount,
  };
}

export async function getUnreadNotificationCount(profileId: string) {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, profileId), eq(notifications.status, "unread")));

  return Number(rows[0]?.value ?? 0);
}
