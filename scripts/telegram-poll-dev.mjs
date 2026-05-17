/**
 * Local dev: long-poll Telegram and forward updates to Next.js webhook.
 * Run via `npm run dev` (starts automatically) or `npm run telegram:poll`.
 */
import { loadEnv } from "./lib/load-env.mjs";

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ?? "";
const localPort = process.env.PORT ?? "3000";
const webhookTarget =
  process.env.TELEGRAM_LOCAL_WEBHOOK_URL ??
  `http://127.0.0.1:${localPort}/api/notifications/telegram/webhook`;

if (!token) {
  console.error("[telegram-poll] Missing TELEGRAM_BOT_TOKEN in .env.local");
  process.exit(1);
}

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function deleteWebhook() {
  const data = await tg("deleteWebhook", { drop_pending_updates: true });
  if (!data.ok) {
    console.warn("[telegram-poll] deleteWebhook:", data);
  } else {
    console.log("[telegram-poll] Webhook cleared — using long polling for local dev");
  }
}

async function waitForNext() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(webhookTarget, { method: "GET" });
      if (res.ok) return true;
    } catch {
      /* server not ready */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function forwardUpdate(update) {
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["x-telegram-bot-api-secret-token"] = secret;

  const res = await fetch(webhookTarget, {
    method: "POST",
    headers,
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[telegram-poll] forward failed", res.status, text.slice(0, 200));
  }
}

async function pollLoop() {
  let offset = 0;
  console.log(`[telegram-poll] Forwarding to ${webhookTarget}`);
  console.log("[telegram-poll] Send /start to your bot in Telegram now.");

  while (true) {
    const data = await tg("getUpdates", {
      offset,
      timeout: 50,
      allowed_updates: ["message", "callback_query"],
    });

    if (!data.ok) {
      console.error("[telegram-poll] getUpdates error:", data);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    for (const update of data.result ?? []) {
      offset = update.update_id + 1;
      if (update.message?.text?.startsWith("/")) {
        console.log(
          "[telegram-poll]",
          update.message.text,
          "chat",
          update.message.chat?.id,
        );
      }
      await forwardUpdate(update);
    }
  }
}

await deleteWebhook();
const ready = await waitForNext();
if (!ready) {
  console.error(
    "[telegram-poll] Next.js not reachable at",
    webhookTarget,
    "— start the app first (npm run dev)",
  );
  process.exit(1);
}

await pollLoop();
