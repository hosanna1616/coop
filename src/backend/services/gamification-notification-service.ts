import { routeNotification } from "@/backend/services/notification-router-service";
import { prisma } from "@/lib/prisma";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationChannel =
  | "IN_APP"
  | "WHATSAPP"
  | "TELEGRAM"
  | "WEB_PUSH";

interface RichNotificationData {
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  userId: string;
  branchId?: string;
  missionId?: string;
  missionTaskId?: string;
  metadata?: Record<string, any>;
}

export async function createRichNotification(
  data: RichNotificationData,
): Promise<void> {
  await routeNotification({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    priority: data.priority,
    metadata: data.metadata,
    actionUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/profile`
      : "/profile",
    branchId: data.branchId,
    missionId: data.missionId,
    missionTaskId: data.missionTaskId,
  });
}

export async function createAchievementNotification(
  userId: string,
  achievementCode: string,
  achievementTitle: string,
  xpReward: number,
): Promise<void> {
  await createRichNotification({
    type: "ACHIEVEMENT",
    title: "🏆 Achievement Unlocked!",
    message: `You earned "${achievementTitle}"! +${xpReward} XP`,
    priority: "HIGH",
    userId,
    metadata: { achievementCode, achievementTitle, xpReward, showPopup: true },
  });
}

export async function createStreakNotification(
  userId: string,
  streak: number,
  isMilestone: boolean,
): Promise<void> {
  if (isMilestone) {
    await createRichNotification({
      type: "STREAK_MILESTONE",
      title: "🔥 Streak Milestone!",
      message: `Incredible! You've reached a ${streak}-day streak! Keep it up!`,
      priority: "HIGH",
      userId,
      metadata: { streak, isMilestone, showPopup: true, celebrate: true },
    });
  }
}

export async function createScratchCardNotification(
  userId: string,
  cardId: string,
): Promise<void> {
  await createRichNotification({
    type: "SCRATCH_CARD",
    title: "🎰 You Earned a Scratch Card!",
    message: "Tap to reveal your reward!",
    priority: "HIGH",
    userId,
    metadata: { cardId, showPopup: true, scratchCard: true },
  });
}

export async function createFlashMissionNotification(
  userId: string,
  missionTitle: string,
  missionDescription: string,
  xpMultiplier: number,
): Promise<void> {
  await createRichNotification({
    type: "FLASH_MISSION",
    title: "⚡ Flash Mission Available!",
    message: `${missionTitle} - ${xpMultiplier}x XP!`,
    priority: "URGENT",
    userId,
    metadata: {
      missionTitle,
      missionDescription,
      xpMultiplier,
      showPopup: true,
      expires: true,
    },
  });
}

export async function createChallengeReminderNotification(
  userId: string,
  challengesRemaining: number,
): Promise<void> {
  await createRichNotification({
    type: "CHALLENGE_REMINDER",
    title: "🎯 Daily Challenges",
    message: `You have ${challengesRemaining} challenges remaining today. Don't miss out on XP!`,
    priority: "NORMAL",
    userId,
    metadata: { challengesRemaining, showPopup: false },
  });
}

export async function createLeaderboardNotification(
  userId: string,
  newRank: number,
  previousRank: number,
): Promise<void> {
  const improved = newRank < previousRank;
  await createRichNotification({
    type: "LEADERBOARD_UPDATE",
    title: improved ? "📈 You Moved Up!" : "📊 Leaderboard Update",
    message: improved
      ? `You're now #${newRank} on the leaderboard! Keep climbing!`
      : `You're ranked #${newRank}. Register more to climb higher!`,
    priority: improved ? "HIGH" : "LOW",
    userId,
    metadata: { newRank, previousRank, improved, showPopup: improved },
  });
}

export async function getUnseenPopupNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      seenAt: null,
      metadata: {
        path: ["showPopup"],
        equals: true,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
