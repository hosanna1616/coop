import { prisma } from "@/lib/prisma";

export type ScratchCardReward = {
  type: "XP" | "FREEZE_SHIELD" | "POWER_UP" | "RAFFLE_TICKET";
  value: number;
  label: string;
};

const REWARD_TABLE: ScratchCardReward[] = [
  { type: "XP", value: 50, label: "50 XP" },
  { type: "XP", value: 100, label: "100 XP" },
  { type: "XP", value: 150, label: "150 XP" },
  { type: "XP", value: 200, label: "200 XP" },
  { type: "XP", value: 500, label: "500 XP (JACKPOT!)" },
  { type: "FREEZE_SHIELD", value: 1, label: "Freeze Shield" },
  { type: "POWER_UP", value: 60, label: "1 Hour Double XP" },
  { type: "RAFFLE_TICKET", value: 1, label: "Weekly Raffle Ticket" },
];

function getWeightedReward(): ScratchCardReward {
  const weights = [30, 25, 20, 10, 2, 8, 4, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return REWARD_TABLE[i];
    }
  }

  return REWARD_TABLE[0];
}

export async function generateScratchCard(userId: string): Promise<{
  id: string;
  reward: ScratchCardReward;
}> {
  const reward = getWeightedReward();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const card = await prisma.scratchCard.create({
    data: {
      userId,
      rewardType: reward.type,
      rewardValue: reward.value,
      expiresAt,
      revealed: false,
    },
  });

  return {
    id: card.id,
    reward,
  };
}

export async function revealScratchCard(
  cardId: string,
  userId: string,
): Promise<{
  success: boolean;
  reward?: ScratchCardReward;
  error?: string;
}> {
  const card = await prisma.scratchCard.findUnique({
    where: { id: cardId },
  });

  if (!card) {
    return { success: false, error: "Card not found" };
  }

  if (card.userId !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  if (card.revealed) {
    return { success: false, error: "Card already revealed" };
  }

  if (card.expiresAt < new Date()) {
    return { success: false, error: "Card expired" };
  }

  const reward: ScratchCardReward = {
    type: card.rewardType as ScratchCardReward["type"],
    value: card.rewardValue,
    label: getRewardLabel(card.rewardType, card.rewardValue),
  };

  await prisma.$transaction(async (tx) => {
    await tx.scratchCard.update({
      where: { id: cardId },
      data: { revealed: true, revealedAt: new Date() },
    });

    if (card.rewardType === "XP") {
      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: card.rewardValue } },
      });
    } else if (card.rewardType === "FREEZE_SHIELD") {
      const streak = await tx.userStreak.findUnique({ where: { userId } });
      if (streak) {
        await tx.userStreak.update({
          where: { userId },
          data: { freezeShields: { increment: card.rewardValue } },
        });
      }
    }
  });

  return { success: true, reward };
}

function getRewardLabel(type: string, value: number): string {
  const reward = REWARD_TABLE.find((r) => r.type === type && r.value === value);
  return reward?.label ?? `${value} ${type}`;
}

export async function getUserScratchCards(userId: string) {
  return prisma.scratchCard.findMany({
    where: {
      userId,
      expiresAt: { gte: new Date() },
    },
    orderBy: [{ revealed: "asc" }, { expiresAt: "asc" }],
  });
}

export async function getUnrevealedCardCount(userId: string): Promise<number> {
  return prisma.scratchCard.count({
    where: {
      userId,
      revealed: false,
      expiresAt: { gte: new Date() },
    },
  });
}
