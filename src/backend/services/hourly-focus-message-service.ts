import { prisma } from "@/lib/prisma";

export type HourlyFocusPayload = {
  title: string;
  message: string;
  metadata: Record<string, unknown>;
};

export async function buildHourlyFocusPayload(
  userId: string,
  now = new Date(),
): Promise<HourlyFocusPayload> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const [todayScouts, currentStreak, totalScouts] = await Promise.all([
    prisma.lead.count({
      where: {
        scoutedById: userId,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.userStreak
      .findUnique({
        where: { userId },
        select: { currentStreak: true },
      })
      .then((s) => s?.currentStreak ?? 0),
    prisma.lead.count({
      where: { scoutedById: userId },
    }),
  ]);

  const dailyScoutTarget = 3;
  const remainingToday = Math.max(0, dailyScoutTarget - todayScouts);
  const cadetRemaining = Math.max(0, 7 - totalScouts);
  const officerRemaining = Math.max(0, 14 - totalScouts);

  const title =
    remainingToday > 0 ? "⏰ Hourly Focus Check" : "✅ Great Momentum";
  const message =
    remainingToday > 0
      ? `You scouted ${todayScouts}/${dailyScoutTarget} today. ${remainingToday} more to hit today's focus target. Streak: ${currentStreak}.`
      : `You already hit today's scout focus (${todayScouts}/${dailyScoutTarget}). Keep building your streak (${currentStreak}) and badges (Cadet in ${cadetRemaining}, Officer in ${officerRemaining}).`;

  return {
    title,
    message,
    metadata: {
      todayScouts,
      dailyScoutTarget,
      remainingToday,
      currentStreak,
      totalScouts,
      cadetRemaining,
      officerRemaining,
      generatedAtHour: now.toISOString().slice(0, 13),
      showPopup: true,
    },
  };
}
