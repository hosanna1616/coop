import { prisma } from "@/lib/prisma";

const CHALLENGE_TEMPLATES = [
  {
    title: "Scout 3 leads",
    description: "Find and register 3 new potential merchants",
    type: "LEADS",
    targetValue: 3,
    xpReward: 50,
  },
  {
    title: "Scout 5 leads",
    description: "Find and register 5 new potential merchants",
    type: "LEADS",
    targetValue: 5,
    xpReward: 100,
  },
  {
    title: "Induct 2 merchants",
    description: "Complete onboarding for 2 merchants",
    type: "MERCHANTS",
    targetValue: 2,
    xpReward: 150,
  },
  {
    title: "Induct 5 merchants",
    description: "Complete onboarding for 5 merchants",
    type: "MERCHANTS",
    targetValue: 5,
    xpReward: 400,
  },
  {
    title: "Visit 5 zones",
    description: "Scout in 5 different zones today",
    type: "ZONES",
    targetValue: 5,
    xpReward: 75,
  },
  {
    title: "80% conversion rate",
    description: "Convert 80% of your leads to merchants today (min 3 leads)",
    type: "CONVERSIONS",
    targetValue: 80,
    xpReward: 200,
  },
  {
    title: "Morning warrior",
    description: "Register a lead before 9 AM",
    type: "LEADS",
    targetValue: 1,
    xpReward: 50,
  },
  {
    title: "Zone conqueror",
    description: "Capture a zone by registering 10 merchants",
    type: "MERCHANTS",
    targetValue: 10,
    xpReward: 500,
  },
];

export async function generateDailyChallenges(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyChallenge.count({
    where: { userId, date: today },
  });

  if (existing >= 3) return;

  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  for (const template of selected) {
    await prisma.dailyChallenge
      .create({
        data: {
          userId,
          title: template.title,
          description: template.description,
          targetType: template.type,
          targetValue: template.targetValue,
          currentValue: 0,
          xpReward: template.xpReward,
          date: today,
        },
      })
      .catch(() => {});
  }
}

export async function updateChallengeProgress(
  userId: string,
  type: string,
  increment: number = 1,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const challenges = await prisma.dailyChallenge.findMany({
    where: {
      userId,
      date: today,
      targetType: type,
      completed: false,
    },
  });

  for (const challenge of challenges) {
    const newValue = Math.min(
      challenge.currentValue + increment,
      challenge.targetValue,
    );

    if (newValue >= challenge.targetValue && !challenge.completed) {
      await prisma.dailyChallenge.update({
        where: { id: challenge.id },
        data: {
          currentValue: newValue,
          completed: true,
          completedAt: new Date(),
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: challenge.xpReward } },
      });
    } else {
      await prisma.dailyChallenge.update({
        where: { id: challenge.id },
        data: { currentValue: newValue },
      });
    }
  }
}

export async function getTodaysChallenges(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.dailyChallenge.findMany({
    where: { userId, date: today },
    orderBy: { completed: "asc" },
  });
}

export async function checkAllChallengesComplete(
  userId: string,
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const challenges = await prisma.dailyChallenge.findMany({
    where: { userId, date: today },
  });

  return challenges.length === 3 && challenges.every((c) => c.completed);
}
