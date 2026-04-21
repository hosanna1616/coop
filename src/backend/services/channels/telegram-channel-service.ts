type TelegramPayload = {
  chatId: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export async function sendTelegramNotification(
  payload: TelegramPayload,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };

  const text = `<b>${payload.title}</b>\n${payload.message}`;
  const body: Record<string, unknown> = {
    chat_id: payload.chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (payload.actionUrl) {
    body.reply_markup = {
      inline_keyboard: [[{ text: "Scout Now", url: payload.actionUrl }]],
    };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: `Telegram API ${res.status}` };
  return { ok: true };
}

