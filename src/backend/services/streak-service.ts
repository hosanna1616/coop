import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function reconcileStreakForToday(userId: string) {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  if (!streak) return null;

  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const lastAction = new Date(streak.lastActionDate);
  lastAction.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Self-heal: if streak is zero but user already has activity today,
  // recover streak to 1 so UI and notifications stay consistent.
  if (streak.currentStreak <= 0) {
    const [leadToday, merchantToday] = await Promise.all([
      prisma.lead.findFirst({
        where: {
          scoutedById: userId,
          createdAt: { gte: today, lt: tomorrow },
        },
        select: { id: true },
      }),
      prisma.merchant.findFirst({
        where: {
          inductedById: userId,
          onboardingDate: { gte: today, lt: tomorrow },
        },
        select: { id: true },
      }),
    ]);
    if (leadToday || merchantToday) {
      return prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(streak.longestStreak, 1),
          lastActionDate: today,
        },
      });
    }
  }

  // 0: acted today, 1: still alive (acted yesterday), >1: missed at least one day.
  if (diffDays <= 1) return streak;

  const missedDays = diffDays - 1;
  if (streak.freezeShields >= missedDays) {
    // Auto-use shields for missed days and preserve streak.
    return prisma.userStreak.update({
      where: { userId },
      data: {
        freezeShields: streak.freezeShields - missedDays,
        // Mark as "kept alive until yesterday" so today's action increments correctly.
        lastActionDate: addDays(today, -1),
      },
    });
  }

  // Not enough shields: streak is lost.
  return prisma.userStreak.update({
    where: { userId },
    data: {
      currentStreak: 0,
      freezeShields: 0,
      lastActionDate: addDays(today, -1),
    },
  });
}

export async function updateUserStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  streakIncreased: boolean;
  milestone: boolean;
}> {
  const today = startOfToday();

  let streak = await reconcileStreakForToday(userId);
  if (!streak) {
    streak = await prisma.userStreak.findUnique({
      where: { userId },
    });
  }

  if (!streak) {
    streak = await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActionDate: today,
        freezeShields: 0,
      },
    });
    return {
      currentStreak: 1,
      longestStreak: 1,
      streakIncreased: true,
      milestone: false,
    };
  }

  const lastAction = new Date(streak.lastActionDate);
  lastAction.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    // Recovery path: if streak was already reset to zero earlier today,
    // treat the current action as a fresh start instead of staying at zero.
    if (streak.currentStreak <= 0) {
      const updated = await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(streak.longestStreak, 1),
          lastActionDate: today,
        },
      });
      return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        streakIncreased: true,
        milestone: false,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakIncreased: false,
      milestone: false,
    };
  }

  if (diffDays === 1) {
    const newStreak = streak.currentStreak + 1;
    const newLongest = Math.max(streak.longestStreak, newStreak);

    let earnedShield = false;
    if (newStreak % 10 === 0 && streak.freezeShields < 3) {
      earnedShield = true;
    }

    const updated = await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActionDate: today,
        freezeShields: earnedShield
          ? streak.freezeShields + 1
          : streak.freezeShields,
      },
    });

    const isMilestone = [7, 14, 21, 30, 50, 100, 365].includes(newStreak);

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      streakIncreased: true,
      milestone: isMilestone,
    };
  }

  // Safety fallback: if clock/date anomalies happen, keep current values.
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    streakIncreased: false,
    milestone: false,
  };
}

export async function getUserStreak(userId: string) {
  const reconciled = await reconcileStreakForToday(userId);
  if (reconciled) return reconciled;
  return prisma.userStreak.findUnique({
    where: { userId },
  });
}

export async function useFreezeShield(userId: string): Promise<boolean> {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak || streak.freezeShields <= 0) {
    return false;
  }

  await prisma.userStreak.update({
    where: { userId },
    data: { freezeShields: { decrement: 1 } },
  });

  return true;
}
