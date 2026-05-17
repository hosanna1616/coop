import { NextRequest, NextResponse } from "next/server";
import { sendTelegramBotMessage } from "@/backend/services/channels/telegram-channel-service";
import {
  getTelegramLinkBaseUrl,
  processTelegramUpdate,
} from "@/backend/services/telegram-bot-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyTelegramSecret(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  if (!expected) return true;
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}

export async function GET() {
  const token = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  return NextResponse.json({
    ok: true,
    service: "merchant-nation-telegram-webhook",
    botConfigured: token,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    linkBaseUrl: getTelegramLinkBaseUrl(),
    mode: process.env.TELEGRAM_LOCAL_POLLING === "true" ? "local-polling" : "webhook",
  });
}

export async function POST(req: NextRequest) {
  if (!verifyTelegramSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[telegram-webhook] Missing TELEGRAM_BOT_TOKEN");
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const chatId =
    body?.message?.chat?.id != null ? String(body.message.chat.id) : "";

  try {
    await processTelegramUpdate(body ?? {});
  } catch (err) {
    console.error("[telegram-webhook] failed:", err);
    if (chatId) {
      await sendTelegramBotMessage({
        chat_id: chatId,
        text: "Something went wrong. Try /menu in a moment.",
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({ ok: true });
}
