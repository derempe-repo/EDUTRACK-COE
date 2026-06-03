import { and, desc, eq, sql } from "drizzle-orm";

import { notifications } from "@/db/schema";
import { db } from "@/lib/db";

export const NOTIFICATION_PAGE_SIZE = 30;

export async function getNotificationCenterData(profileId: string, page = 1) {
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const [rows, unreadRows, totalRows] = await Promise.all([
    db
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
      .limit(NOTIFICATION_PAGE_SIZE)
      .offset((currentPage - 1) * NOTIFICATION_PAGE_SIZE),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, profileId), eq(notifications.status, "unread"))),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.recipientId, profileId)),
  ]);

  return {
    notifications: rows,
    pagination: {
      page: currentPage,
      pageSize: NOTIFICATION_PAGE_SIZE,
      totalItems: Number(totalRows[0]?.value ?? 0),
    },
    unreadCount: Number(unreadRows[0]?.value ?? 0),
  };
}

export async function getUnreadNotificationCount(profileId: string) {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, profileId), eq(notifications.status, "unread")));

  return Number(rows[0]?.value ?? 0);
}
