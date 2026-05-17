import { prisma } from "@/lib/prisma";
import { getOrCreateNotificationPreferences } from "@/backend/services/notification-preferences-service";
import { sendTelegramBotMessage } from "@/backend/services/channels/telegram-channel-service";
import { getTelegramLinkBaseUrl } from "@/lib/telegram-links";

export { getTelegramLinkBaseUrl };

export function buildTelegramMainMenu(chatId: string) {
  const base = getTelegramLinkBaseUrl();
  return {
    chat_id: chatId,
    text: "Tap a button to jump back into Merchant Nation:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Scout now", url: `${base}/report` }],
        [{ text: "📱 Open app home", url: base }],
        [{ text: "👤 Profile", url: `${base}/profile` }],
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

  const linked = await sendTelegramBotMessage({
    chat_id: chatId,
    text:
      `✅ Telegram connected for ${user.name}.\n` +
      `You will receive hourly focus reminders and streak alerts here.\n` +
      `Use the buttons below to jump back into the app anytime.`,
  });
  if (!linked.ok) {
    console.error("[telegram] link confirm failed:", linked.error);
  }

  const menu = await sendTelegramBotMessage(buildTelegramMainMenu(chatId));
  if (!menu.ok) {
    console.error("[telegram] menu failed:", menu.error);
  }
  return true;
}

export async function handleTelegramCommand(
  text: string,
  chatId: string,
): Promise<void> {
  const [command, arg] = text.trim().split(/\s+/, 2);
  const base = getTelegramLinkBaseUrl();
  const cmd = command.split("@")[0]?.toLowerCase() ?? "";

  if (cmd === "/start") {
    if (arg?.startsWith("u_")) {
      const ok = await linkTelegramUser(arg.slice(2), chatId);
      if (ok) return;
    }
    const welcome = await sendTelegramBotMessage({
      chat_id: chatId,
      text:
        "👋 Welcome to Merchant Nation Command.\n\n" +
        "1. Sign in at the app\n" +
        "2. Open Profile → Connect Telegram\n" +
        "3. Press Start in this chat to link your account\n\n" +
        "Or use the buttons below to open the app.",
    });
    if (!welcome.ok) console.error("[telegram] welcome failed:", welcome.error);
    const menu = await sendTelegramBotMessage(buildTelegramMainMenu(chatId));
    if (!menu.ok) console.error("[telegram] menu failed:", menu.error);
    return;
  }

  if (cmd === "/help" || cmd === "/menu") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text:
        "Commands:\n" +
        "/menu — quick actions\n" +
        "/scout — scout section\n" +
        "/profile — your profile\n" +
        "/help — this message",
    });
    await sendTelegramBotMessage(buildTelegramMainMenu(chatId));
    return;
  }

  if (cmd === "/scout") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text: "Open scout section:",
      reply_markup: {
        inline_keyboard: [[{ text: "🎯 Scout now", url: `${base}/report` }]],
      },
    });
    return;
  }

  if (cmd === "/profile") {
    await sendTelegramBotMessage({
      chat_id: chatId,
      text: "Open your profile:",
      reply_markup: {
        inline_keyboard: [[{ text: "👤 Profile", url: `${base}/profile` }]],
      },
    });
    return;
  }

  await sendTelegramBotMessage({
    chat_id: chatId,
    text: "Unknown command. Send /help or /menu.",
  });
}

export async function processTelegramUpdate(body: {
  message?: { text?: string; chat?: { id?: number } };
}): Promise<void> {
  const msg = body?.message;
  const text = (msg?.text ?? "").trim();
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : "";
  if (!chatId || !text.startsWith("/")) return;
  await handleTelegramCommand(text, chatId);
}
