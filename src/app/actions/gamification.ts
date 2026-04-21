"use server";

import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkAndUnlockAchievements,
  getUserAchievements,
  type AchievementDefinition,
} from "@/backend/services/achievement-service";
import {
  updateUserStreak,
  getUserStreak,
} from "@/backend/services/streak-service";
import {
  generateScratchCard,
  revealScratchCard,
  getUserScratchCards,
} from "@/backend/services/scratchcard-service";
import {
  getTodaysChallenges,
  updateChallengeProgress,
  generateDailyChallenges,
} from "@/backend/services/challenges-service";
import {
  createAchievementNotification,
  createStreakNotification,
  createScratchCardNotification,
} from "@/backend/services/gamification-notification-service";

export async function triggerGamificationOnAction(
  actionType: "LEAD" | "MERCHANT",
) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "triggerGamificationOnAction",
  );

  const results: {
    streak: Awaited<ReturnType<typeof updateUserStreak>> | null;
    achievements: string[];
    scratchCard: { id: string; reward: any } | null;
    challengesUpdated: boolean;
    notifications: string[];
  } = {
    streak: null,
    achievements: [],
    scratchCard: null,
    challengesUpdated: false,
    notifications: [],
  };

  try {
    const [streakResult, achievements] = await Promise.all([
      updateUserStreak(session.id),
      checkAndUnlockAchievements(session.id),
    ]);

    results.streak = streakResult;
    results.achievements = achievements;

    if (streakResult.milestone) {
      await createStreakNotification(
        session.id,
        streakResult.currentStreak,
        true,
      );
      results.notifications.push("streak_milestone");
    }

    for (const achievement of achievements) {
      const achievementData = await getUserAchievements(session.id);
      const newAchievement = achievementData.find(
        (a: { code: string }) => a.code === achievement,
      );
      if (newAchievement) {
        await createAchievementNotification(
          session.id,
          newAchievement.code,
          newAchievement.title,
          newAchievement.xpReward,
        );
        results.notifications.push("achievement");
      }
    }

    if (actionType === "MERCHANT") {
      const scratchCard = await generateScratchCard(session.id);
      results.scratchCard = scratchCard;

      await createScratchCardNotification(session.id, scratchCard.id);
      results.notifications.push("scratch_card");
    }

    await updateChallengeProgress(
      session.id,
      actionType === "LEAD" ? "LEADS" : "MERCHANTS",
      1,
    );
    results.challengesUpdated = true;

    await generateDailyChallenges(session.id);
  } catch (error) {
    console.error("Error in gamification trigger:", error);
  }

  return results;
}

export async function getGamificationData() {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "getGamificationData",
  );

  const [streak, achievements, scratchCards, challenges, latestLead, latestMerchant] = await Promise.all([
    getUserStreak(session.id),
    getUserAchievements(session.id),
    getUserScratchCards(session.id),
    getTodaysChallenges(session.id),
    prisma.lead.findFirst({
      where: { scoutedById: session.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.merchant.findFirst({
      where: { inductedById: session.id },
      orderBy: { onboardingDate: "desc" },
      select: { onboardingDate: true },
    }),
  ]);

  const lastActiveAt = (() => {
    const leadAt = latestLead?.createdAt ?? null;
    const merchantAt = latestMerchant?.onboardingDate ?? null;
    if (!leadAt) return merchantAt;
    if (!merchantAt) return leadAt;
    return leadAt > merchantAt ? leadAt : merchantAt;
  })();

  return {
    streak: streak
      ? {
          ...streak,
          lastActiveAt,
        }
      : null,
    achievements,
    scratchCards,
    challenges,
    xp: (await prisma.user.findUnique({ where: { id: session.id } }))?.xp || 0,
  };
}

export async function handleRevealScratchCard(cardId: string) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "handleRevealScratchCard",
  );
  return revealScratchCard(cardId, session.id);
}

export async function getContributionActivityData(days: number = 365) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "getContributionActivityData",
  );

  const safeDays = Math.min(Math.max(days, 30), 365);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  // Use current-year activity window (requested: start from 2026, not 2025).
  const startOfCurrentYear = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
  const lookbackStart = new Date(end);
  lookbackStart.setDate(end.getDate() - (safeDays - 1));
  lookbackStart.setHours(0, 0, 0, 0);
  const start = lookbackStart < startOfCurrentYear ? startOfCurrentYear : lookbackStart;

  const [leads, merchants] = await Promise.all([
    prisma.lead.findMany({
      where: {
        scoutedById: session.id,
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true },
    }),
    prisma.merchant.findMany({
      where: {
        inductedById: session.id,
        onboardingDate: { gte: start, lte: end },
      },
      select: { onboardingDate: true },
    }),
  ]);

  const rows = new Map<string, { date: string; leads: number; merchants: number }>();
  const toKey = (d: Date) => d.toISOString().slice(0, 10);
  const ensure = (key: string) => {
    if (!rows.has(key)) rows.set(key, { date: key, leads: 0, merchants: 0 });
    return rows.get(key)!;
  };

  for (let i = 0; i < safeDays; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = toKey(day);
    ensure(key);
  }

  for (const row of leads) ensure(toKey(row.createdAt)).leads += 1;
  for (const row of merchants) ensure(toKey(row.onboardingDate)).merchants += 1;

  const activity = Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
  const activeDays = activity.filter((d) => d.leads > 0 || d.merchants > 0).length;
  const totals = activity.reduce(
    (acc, d) => {
      acc.leads += d.leads;
      acc.merchants += d.merchants;
      return acc;
    },
    { leads: 0, merchants: 0 },
  );
  const mostActive = activity.reduce(
    (best, d) => {
      const total = d.leads + d.merchants;
      const bestTotal = best.leads + best.merchants;
      return total > bestTotal ? d : best;
    },
    { date: activity[0]?.date ?? "", leads: 0, merchants: 0 },
  );

  return {
    days: activity.length,
    totals,
    activeDays,
    mostActive,
    activity,
  };
}
