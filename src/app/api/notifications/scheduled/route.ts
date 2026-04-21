import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeNotification } from "@/backend/services/notification-router-service";

type ScheduledJob =
  | "daily-8am"
  | "daily-2pm"
  | "daily-5pm-urgent"
  | "weekly-sunday-7pm";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function runDailyMorning() {
  const users = await prisma.userStreak.findMany({
    where: { currentStreak: { gt: 0 } },
    select: { userId: true, currentStreak: true },
    take: 5000,
  });
  await Promise.all(
    users.map((u) =>
      routeNotification({
        userId: u.userId,
        type: "DAILY_STREAK_REMINDER",
        title: "🔥 Keep your streak alive",
        message: `You are on a ${u.currentStreak}-day streak. Scout today to continue.`,
        priority: "NORMAL",
        actionUrl: `${getBaseUrl()}/report`,
      }),
    ),
  );
  return users.length;
}

async function runDailyInactiveReminder() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const users = await prisma.userStreak.findMany({
    where: { lastActionDate: { lt: today }, currentStreak: { gt: 0 } },
    select: { userId: true, currentStreak: true },
    take: 5000,
  });
  await Promise.all(
    users.map((u) =>
      routeNotification({
        userId: u.userId,
        type: "INACTIVE_REMINDER",
        title: "⏰ No scout yet today",
        message: `Your ${u.currentStreak}-day streak is waiting. Add a scout now.`,
        priority: "HIGH",
        actionUrl: `${getBaseUrl()}/report`,
      }),
    ),
  );
  return users.length;
}

async function runDailyUrgent() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const users = await prisma.userStreak.findMany({
    where: { lastActionDate: { lt: today }, currentStreak: { gt: 0 } },
    select: { userId: true, currentStreak: true },
    take: 5000,
  });
  await Promise.all(
    users.map((u) =>
      routeNotification({
        userId: u.userId,
        type: "STREAK_AT_RISK",
        title: "🚨 Streak at risk",
        message: `Urgent: your ${u.currentStreak}-day streak expires today if you do not scout.`,
        priority: "URGENT",
        actionUrl: `${getBaseUrl()}/report`,
      }),
    ),
  );
  return users.length;
}

async function runWeeklyReport() {
  const users = await prisma.user.findMany({
    where: { role: "PLAYER" },
    select: { id: true, name: true, xp: true, _count: { select: { scoutedLeads: true } } },
    take: 5000,
  });
  await Promise.all(
    users.map((u) =>
      routeNotification({
        userId: u.id,
        type: "WEEKLY_PROGRESS_REPORT",
        title: "📊 Weekly Progress",
        message: `${u.name}, this week snapshot: ${u._count.scoutedLeads} scouts and ${u.xp} XP.`,
        priority: "NORMAL",
        actionUrl: `${getBaseUrl()}/profile`,
      }),
    ),
  );
  return users.length;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scheduler-secret");
  if (!process.env.NOTIFICATION_SCHEDULER_SECRET || secret !== process.env.NOTIFICATION_SCHEDULER_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { job?: ScheduledJob };
  const job = body.job;
  if (!job) return NextResponse.json({ ok: false, error: "Missing job" }, { status: 400 });

  let processed = 0;
  if (job === "daily-8am") processed = await runDailyMorning();
  if (job === "daily-2pm") processed = await runDailyInactiveReminder();
  if (job === "daily-5pm-urgent") processed = await runDailyUrgent();
  if (job === "weekly-sunday-7pm") processed = await runWeeklyReport();

  return NextResponse.json({ ok: true, job, processed });
}

