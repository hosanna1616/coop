import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateNotificationPreferences } from "@/backend/services/notification-preferences-service";
import { sendTelegramBotMessage } from "@/backend/services/channels/telegram-channel-service";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function buildMainMenu(chatId: string) {
  const base = getBaseUrl();
  return {
    chat_id: chatId,
    text: "Choose an action:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Scout Section", url: `${base}/report` }],
        [{ text: "Open Profile", url: `${base}/profile` }],
      ],
    },
  };
}

async function linkTelegramUser(userId: string, chatId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) return false;

  const pref = await getOrCreateNotificationPreferences(user.id);
  const channels = { ...pref.channelsNormalized };
  channels.TELEGRAM.enabled = true;
  channels.TELEGRAM.telegramChatId = chatId;
  await prisma.userNotificationPreference.update({
    where: { userId: user.id },
    data: { channels: channels as unknown as object },
  });

  await sendTelegramBotMessage({
    chat_id: chatId,
    text: `✅ Telegram connected for ${user.name}.\nYou will now receive notifications here.`,
  });
  await sendTelegramBotMessage(buildMainMenu(chatId));
  return true;
}

async function handleCommand(text: string, chatId: string): Promise<void> {
  const [command, arg] = text.trim().split(/\s+/, 2);
  const base = getBaseUrl();

  if (command === "/start") {
    if (arg?.startsWith("u_")) {
      const ok = await linkTelegramUser(arg.slice(2), chatId);
      if (ok) return;
    }
    await sendTelegramBotMessage({
      chat_id: chatId,
      text:
        "👋 Welcome to Merchant Nation bot.\n" +
        "Open Profile in the app and tap Connect Telegram to link your account.",
    });
    await sendTelegramBotMessage(buildMainMenu(chatId));
    return;
  }

  if (command === "/help" || command === "/menu") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text:
        "Available commands:\n" +
        "/menu - show quick actions\n" +
        "/scout - open scout section\n" +
        "/profile - open profile\n" +
        "/help - show this help",
    });
    await sendTelegramBotMessage(buildMainMenu(chatId));
    return;
  }

  if (command === "/scout") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text: "Open scout section:",
      reply_markup: {
        inline_keyboard: [[{ text: "Open Scout Section", url: `${base}/report` }]],
      },
    });
    return;
  }

  if (command === "/profile") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text: "Open your profile:",
      reply_markup: {
        inline_keyboard: [[{ text: "Open Profile", url: `${base}/profile` }]],
      },
    });
    return;
  }

  await sendTelegramBotMessage({
    chat_id: chatId,
    text: "I did not recognize that command. Send /help to see available commands.",
  });
}

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
  if (!chatId || !text.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }
  await handleCommand(text, chatId);

  return NextResponse.json({ ok: true });
}

