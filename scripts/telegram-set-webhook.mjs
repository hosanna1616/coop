/**
 * Register Telegram webhook (production / deployed).
 * Usage: npm run telegram:webhook
 */
import { loadEnv } from "./lib/load-env.mjs";

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
const base = (
  process.env.TELEGRAM_WEBHOOK_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  ""
).replace(/\/+$/, "");

if (!token || !base) {
  console.error("Set TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_APP_URL (or TELEGRAM_WEBHOOK_BASE_URL)");
  process.exit(1);
}

if (base.includes("localhost") || base.includes("127.0.0.1")) {
  console.error(
    "Use a public HTTPS URL for webhooks. For local dev run: npm run dev (uses polling).",
  );
  process.exit(1);
}

const webhookUrl = `${base}/api/notifications/telegram/webhook`;
const body = {
  url: webhookUrl,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
};
if (secret) body.secret_token = secret;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const data = await res.json();
if (!data.ok) {
  console.error("setWebhook failed:", data);
  process.exit(1);
}
console.log("Webhook registered:", webhookUrl);
console.log(data);
