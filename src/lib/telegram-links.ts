/** HTTPS base URL for Telegram inline keyboard buttons (Telegram rejects localhost URLs). */
export function getTelegramLinkBaseUrl(): string {
  const explicit = process.env.TELEGRAM_LINK_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  try {
    const host = new URL(appUrl).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "https://coop-h2jv.vercel.app";
    }
    if (appUrl.startsWith("https://")) return appUrl;
  } catch {
    /* fall through */
  }
  return "https://coop-h2jv.vercel.app";
}
