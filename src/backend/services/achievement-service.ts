import { prisma } from "@/lib/prisma";

export type AchievementType =
  | "STREAK"
  | "VOLUME"
  | "SPEED"
  | "SOCIAL"
  | "TERRITORY";

export interface AchievementDefinition {
  code: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  check: (userId: string) => Promise<boolean>;
}

const MERCHANT_BADGE_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50] as const;

function createMerchantBadgeAchievements(): AchievementDefinition[] {
  return MERCHANT_BADGE_MILESTONES.map((target, index) => ({
    code: `MERCHANT_BADGE_${target}`,
    type: "VOLUME" as const,
    title: `Merchant Badge ${index + 1}`,
    description: `Registered ${target} merchants!`,
    icon: "🛡️",
    xpReward: 80 + index * 20,
    check: async (userId: string) => {
      const count = await prisma.merchant.count({
        where: { inductedById: userId },
      });
      return count >= target;
    },
  }));
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: "FIRST_LEAD",
    type: "VOLUME",
    title: "First Steps",
    description: "Scouted your first lead!",
    icon: "🎯",
    xpReward: 50,
    check: async (userId: string) => {
      const count = await prisma.lead.count({ where: { scoutedById: userId } });
      return count >= 1;
    },
  },
  {
    code: "FIRST_MERCHANT",
    type: "VOLUME",
    title: "Deal Maker",
    description: "Inducted your first merchant!",
    icon: "🤝",
    xpReward: 100,
    check: async (userId: string) => {
      const count = await prisma.merchant.count({
        where: { inductedById: userId },
      });
      return count >= 1;
    },
  },
  ...createMerchantBadgeAchievements(),
  {
    code: "LEAD_HUNTER_10",
    type: "VOLUME",
    title: "Lead Hunter",
    description: "Scouted 10 leads!",
    icon: "🔍",
    xpReward: 150,
    check: async (userId: string) => {
      const count = await prisma.lead.count({ where: { scoutedById: userId } });
      return count >= 10;
    },
  },
  {
    code: "MERCHANT_MASTER_50",
    type: "VOLUME",
    title: "Merchant Master",
    description: "Inducted 50 merchants!",
    icon: "👑",
    xpReward: 500,
    check: async (userId: string) => {
      const count = await prisma.merchant.count({
        where: { inductedById: userId },
      });
      return count >= 50;
    },
  },
  {
    code: "STREAK_7",
    type: "VOLUME",
    title: "Scout Cadet",
    description: "Scouted 7 places!",
    icon: "🛰️",
    xpReward: 100,
    check: async (userId: string) => {
      const count = await prisma.lead.count({ where: { scoutedById: userId } });
      return count >= 7;
    },
  },
  {
    code: "STREAK_14",
    type: "VOLUME",
    title: "Scout Officer",
    description: "Scouted 14 places!",
    icon: "🏅",
    xpReward: 180,
    check: async (userId: string) => {
      const count = await prisma.lead.count({ where: { scoutedById: userId } });
      return count >= 14;
    },
  },
  {
    code: "STREAK_30",
    type: "STREAK",
    title: "Monthly Master",
    description: "30-day activity streak!",
    icon: "⚡",
    xpReward: 300,
    check: async (userId: string) => {
      const streak = await prisma.userStreak.findUnique({ where: { userId } });
      return streak ? streak.currentStreak >= 30 : false;
    },
  },
  {
    code: "STREAK_100",
    type: "STREAK",
    title: "Legendary",
    description: "100-day activity streak! You're unstoppable!",
    icon: "🦁",
    xpReward: 1000,
    check: async (userId: string) => {
      const streak = await prisma.userStreak.findUnique({ where: { userId } });
      return streak ? streak.currentStreak >= 100 : false;
    },
  },
  {
    code: "SPEED_DEMON",
    type: "SPEED",
    title: "Speed Demon",
    description: "Inducted 3 merchants in 1 hour!",
    icon: "💨",
    xpReward: 200,
    check: async (userId: string) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const count = await prisma.merchant.count({
        where: {
          inductedById: userId,
          createdAt: { gte: oneHourAgo },
        },
      });
      return count >= 3;
    },
  },
  {
    code: "ZONE_CONQUEROR",
    type: "TERRITORY",
    title: "Zone Conqueror",
    description: "Captured your first zone with 10+ merchants!",
    icon: "🏰",
    xpReward: 250,
    check: async (userId: string) => {
      const merchants = await prisma.merchant.groupBy({
        by: ["inductedById"],
        _count: { id: true },
      });
      const userMerchants = merchants.find((m) => m.inductedById === userId);
      return userMerchants ? userMerchants._count.id >= 10 : false;
    },
  },
];

export async function checkAndUnlockAchievements(
  userId: string,
): Promise<string[]> {
  const unlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    try {
      const shouldUnlock = await achievement.check(userId);
      if (shouldUnlock) {
        const existing = await prisma.achievement.findUnique({
          where: { userId_code: { userId, code: achievement.code } },
        });

        if (!existing) {
          await prisma.$transaction([
            prisma.achievement.create({
              data: {
                userId,
                type: achievement.type,
                code: achievement.code,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                xpReward: achievement.xpReward,
              },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { xp: { increment: achievement.xpReward } },
            }),
          ]);

          unlocked.push(achievement.code);
        }
      }
    } catch (error) {
      console.error(`Error checking achievement ${achievement.code}:`, error);
    }
  }

  return unlocked;
}

export async function getUserAchievements(userId: string) {
  return prisma.achievement.findMany({
    where: { userId },
    orderBy: [{ unlockedAt: "desc" }],
  });
}

export async function getUnlockedAchievementCount(
  userId: string,
): Promise<number> {
  return prisma.achievement.count({ where: { userId } });
}

export async function getAvailableAchievementCount(): Promise<number> {
  return ACHIEVEMENTS.length;
}
