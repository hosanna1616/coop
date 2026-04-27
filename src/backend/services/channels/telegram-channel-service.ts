type TelegramPayload = {
  chatId: string;
  title: string;
  message: string;
  actionUrl?: string;
};

type TelegramSendBody = {
  chat_id: string;
  text: string;
  parse_mode?: "HTML";
  disable_web_page_preview?: boolean;
  reply_markup?: Record<string, unknown>;
};

export async function sendTelegramBotMessage(
  body: TelegramSendBody,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: `Telegram API ${res.status}` };
  return { ok: true };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendTelegramNotification(
  payload: TelegramPayload,
): Promise<{ ok: boolean; error?: string }> {
  const text = `<b>${escapeHtml(payload.title)}</b>\n${escapeHtml(payload.message)}`;
  const body: TelegramSendBody = {
    chat_id: payload.chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (payload.actionUrl) {
    body.reply_markup = {
      inline_keyboard: [[{ text: "Open Scout Section", url: payload.actionUrl }]],
    };
  }
  return sendTelegramBotMessage(body);
}

