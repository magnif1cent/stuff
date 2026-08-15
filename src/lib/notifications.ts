import { prisma } from "@/lib/prisma";

export type NotificationType = "REPLY" | "LIST_LIKE" | "SUBMISSION_APPROVED" | "SUBMISSION_REJECTED";

interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  message: string;
  link?: string | null;
}

// message/link are captured at creation time rather than derived from a live
// relation — see the schema comment on Notification for why (a rejected
// movie is deleted right after this fires).
export async function createNotification({ recipientId, type, message, link }: CreateNotificationInput) {
  await prisma.notification.create({
    data: { recipientId, type, message, link: link ?? null },
  });
}

// Shown in the navbar bell dropdown — recent notifications plus a total
// unread count for the badge, fetched once server-side on page load (same
// pattern as isEmailVerified), not polled.
const RECENT_NOTIFICATION_LIMIT = 20;

export async function getNotificationsForNavbar(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      take: RECENT_NOTIFICATION_LIMIT,
    }),
    prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
  ]);
  return { notifications, unreadCount };
}
