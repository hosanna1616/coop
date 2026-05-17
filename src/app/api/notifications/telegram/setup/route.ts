import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time setup: register Telegram webhook for the deployed app.
 * GET /api/notifications/telegram/setup?secret=<NOTIFICATION_SCHEDULER_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.NOTIFICATION_SCHEDULER_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://coop-h2jv.vercel.app").replace(
    /\/+$/,
    "",
  );

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN not set on server" },
      { status: 503 },
    );
  }

  const webhookUrl = `${base}/api/notifications/telegram/webhook`;
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  };
  if (webhookSecret) body.secret_token = webhookSecret;

  const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const setData = await setRes.json();

  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const infoData = await infoRes.json();

  return NextResponse.json({
    ok: Boolean(setData.ok),
    webhookUrl,
    setWebhook: setData,
    webhookInfo: infoData,
  });
}
