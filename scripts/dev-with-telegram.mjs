/**
 * Starts Next.js dev server + Telegram long-polling for local bot testing.
 */
import { spawn } from "child_process";
import { loadEnv } from "./lib/load-env.mjs";

loadEnv();

const port = process.env.PORT ?? "3000";
process.env.PORT = port;
process.env.TELEGRAM_LOCAL_POLLING = "true";
process.env.TELEGRAM_LOCAL_WEBHOOK_URL =
  process.env.TELEGRAM_LOCAL_WEBHOOK_URL ??
  `http://127.0.0.1:${port}/api/notifications/telegram/webhook`;

console.log("[dev] Starting Next.js + Telegram local polling…");
console.log("[dev] App: http://localhost:" + port);
console.log(
  "[dev] Bot: @",
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "your_bot",
);

const next = spawn(`npx next dev -p ${port}`, {
  stdio: "inherit",
  env: { ...process.env },
  shell: true,
});

const poll = spawn("node scripts/telegram-poll-dev.mjs", {
  stdio: "inherit",
  env: { ...process.env },
  shell: true,
});

function shutdown() {
  poll.kill("SIGTERM");
  next.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

poll.on("exit", (code) => {
  if (code && code !== 0) {
    console.error("[dev] Telegram poll exited", code);
  }
});

next.on("exit", (code) => {
  poll.kill("SIGTERM");
  process.exit(code ?? 0);
});
