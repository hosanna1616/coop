import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateNotificationPreferences } from "@/backend/services/notification-preferences-service";

export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (expected && got !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const msg = body?.message;
  const text: string = msg?.text ?? "";
  const chatId = String(msg?.chat?.id ?? "");
  if (!text.startsWith("/start") || !chatId) {
    return NextResponse.json({ ok: true });
  }

  const parts = text.split(" ");
  const token = parts[1] ?? "";
  if (!token.startsWith("u_")) {
    return NextResponse.json({ ok: true });
  }
  const userId = token.slice(2);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: true });

  const pref = await getOrCreateNotificationPreferences(user.id);
  const channels = { ...pref.channelsNormalized };
  channels.TELEGRAM.enabled = true;
  channels.TELEGRAM.telegramChatId = chatId;
  await prisma.userNotificationPreference.update({
    where: { userId: user.id },
    data: { channels: channels as unknown as object },
  });

  return NextResponse.json({ ok: true });
}

