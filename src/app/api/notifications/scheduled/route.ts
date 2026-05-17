import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeNotification } from "@/backend/services/notification-router-service";
import { buildHourlyFocusPayload } from "@/backend/services/hourly-focus-message-service";
import * as notificationsRepo from "@/backend/repositories/notifications-repository";

type ScheduledJob =
  | "hourly-work-reminder"
  | "daily-8am"
  | "daily-2pm"
  | "daily-5pm-urgent"
  | "weekly-sunday-7pm";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function isSchedulerAuthorized(req: NextRequest): boolean {
  const secret = process.env.NOTIFICATION_SCHEDULER_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!secret && !cronSecret) return false;

  const headerSecret = req.headers.get("x-scheduler-secret");
  if (secret && headerSecret === secret) return true;

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (secret && bearer === secret) return true;
  if (cronSecret && bearer === cronSecret) return true;

  return false;
}

function parseJob(req: NextRequest): ScheduledJob | null {
  const fromQuery = req.nextUrl.searchParams.get("job");
  if (fromQuery) return fromQuery as ScheduledJob;
  return null;
}

function getTelegramChatId(channels: unknown): string | null {
  if (!channels || typeof channels !== "object") return null;
  const tg = (channels as Record<string, unknown>).TELEGRAM;
  if (!tg || typeof tg !== "object") return null;
  const chatId = (tg as Record<string, unknown>).telegramChatId;
  return typeof chatId === "string" && chatId.length > 0 ? chatId : null;
}

async function listTelegramLinkedPlayerIds(): Promise<string[]> {
  const rows = await prisma.userNotificationPreference.findMany({
    where: { user: { role: "PLAYER" } },
    select: { userId: true, channels: true },
  });
  return rows
    .filter((row) => getTelegramChatId(row.channels))
    .map((row) => row.userId);
}

async function runHourlyWorkReminder() {
  const now = new Date();
  const userIds = await listTelegramLinkedPlayerIds();
  let processed = 0;

  for (const userId of userIds) {
    const alreadySent = await notificationsRepo.hasHourlyFocusNotificationInCurrentHour(
      userId,
      now,
      "TELEGRAM",
    );
    if (alreadySent) continue;

    const { title, message, metadata } = await buildHourlyFocusPayload(userId, now);
    await routeNotification({
      userId,
      type: "HOURLY_PROGRESS_FOCUS",
      title,
      message,
      priority: "HIGH",
      metadata,
      actionUrl: "/report",
    });
    processed += 1;
  }

  return { processed, eligible: userIds.length };
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

async function runJob(job: ScheduledJob) {
  if (job === "hourly-work-reminder") return runHourlyWorkReminder();
  if (job === "daily-8am") return { processed: await runDailyMorning() };
  if (job === "daily-2pm") return { processed: await runDailyInactiveReminder() };
  if (job === "daily-5pm-urgent") return { processed: await runDailyUrgent() };
  if (job === "weekly-sunday-7pm") return { processed: await runWeeklyReport() };
  return null;
}

async function handleScheduler(req: NextRequest) {
  if (!isSchedulerAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let job = parseJob(req);
  if (!job && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { job?: ScheduledJob };
    job = body.job ?? null;
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Missing job" }, { status: 400 });
  }

  const result = await runJob(job);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Unknown job" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, job, ...result });
}

export async function GET(req: NextRequest) {
  return handleScheduler(req);
}

export async function POST(req: NextRequest) {
  return handleScheduler(req);
}
