import { prisma } from "@/lib/prisma";
import {
  ChannelName,
  getOrCreateNotificationPreferences,
  isInQuietHours,
} from "@/backend/services/notification-preferences-service";
import { sendEmailNotification } from "@/backend/services/channels/email-channel-service";
import { sendTelegramNotification } from "@/backend/services/channels/telegram-channel-service";
import { sendWhatsAppNotification } from "@/backend/services/channels/whatsapp-channel-service";
import { sendFacebookNotification } from "@/backend/services/channels/facebook-channel-service";
import { sendWebPushNotification } from "@/backend/services/channels/web-push-channel-service";

export type RoutedNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  branchId?: string;
  missionId?: string;
  missionTaskId?: string;
};

function getBaseAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function normalizeActionUrl(actionUrl?: string): string | undefined {
  if (!actionUrl) return undefined;
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
  const base = getBaseAppUrl();
  const path = actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`;
  return `${base}${path}`;
}

async function createDeliveryRecord(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: ChannelName;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  metadata?: Record<string, unknown>;
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  errorMessage?: string;
  attempts: number;
  branchId?: string;
  missionId?: string;
  missionTaskId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: input.channel,
      priority: input.priority,
      branchId: input.branchId,
      missionId: input.missionId,
      missionTaskId: input.missionTaskId,
      metadata: {
        ...(input.metadata ?? {}),
        deliveryStatus: input.deliveryStatus,
        attempts: input.attempts,
        deliveredAt:
          input.deliveryStatus === "SENT" ? new Date().toISOString() : null,
        errorMessage: input.errorMessage ?? null,
      },
    },
  });
}

async function sendToChannel(
  channel: ChannelName,
  input: RoutedNotificationInput,
  normalizedActionUrl: string | undefined,
  prefChannels: Awaited<
    ReturnType<typeof getOrCreateNotificationPreferences>
  >["channelsNormalized"],
) {
  switch (channel) {
    case "IN_APP":
      return { ok: true as const };
    case "EMAIL":
      return sendEmailNotification({
        userId: input.userId,
        title: input.title,
        message: input.message,
        actionUrl: normalizedActionUrl,
      });
    case "TELEGRAM":
      return sendTelegramNotification({
        chatId: prefChannels.TELEGRAM.telegramChatId ?? "",
        title: input.title,
        message: input.message,
        actionUrl: normalizedActionUrl,
      });
    case "WHATSAPP":
      return sendWhatsAppNotification({
        phone: prefChannels.WHATSAPP.whatsappPhone ?? "",
        title: input.title,
        message: input.message,
      });
    case "FACEBOOK":
      return sendFacebookNotification({
        psid: prefChannels.FACEBOOK.facebookPsid ?? "",
        title: input.title,
        message: input.message,
        actionUrl: normalizedActionUrl,
      });
    case "WEB_PUSH":
      return sendWebPushNotification({
        endpoint: prefChannels.WEB_PUSH.webPushEndpoint,
        title: input.title,
        message: input.message,
        actionUrl: normalizedActionUrl,
      });
    default:
      return { ok: false as const, error: "Unsupported channel" };
  }
}

export async function routeNotification(
  input: RoutedNotificationInput,
): Promise<void> {
  const normalizedActionUrl = normalizeActionUrl(input.actionUrl);

  const priority = input.priority ?? "NORMAL";
  const urgent = priority === "URGENT";
  const prefs = await getOrCreateNotificationPreferences(input.userId);
  const now = new Date();
  const inQuiet = isInQuietHours(
    now,
    prefs.quietHoursStart,
    prefs.quietHoursEnd,
  );

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.notification.count({
    where: {
      userId: input.userId,
      createdAt: { gte: dayStart },
    },
  });
  const overLimit = sentToday >= prefs.maxPerDay;

  const allowedChannels = (Object.keys(prefs.channelsNormalized) as ChannelName[])
    .filter((ch) => prefs.channelsNormalized[ch].enabled)
    .filter((ch) => ch === "IN_APP" || !inQuiet || urgent)
    .filter(() => !overLimit || urgent);

  if (!allowedChannels.includes("IN_APP")) {
    allowedChannels.unshift("IN_APP");
  }

  for (const channel of allowedChannels) {
    let attempts = 0;
    let lastError = "";
    let delivered = false;
    while (attempts < 3 && !delivered) {
      attempts += 1;
      const res = await sendToChannel(
        channel,
        input,
        normalizedActionUrl,
        prefs.channelsNormalized,
      );
      if (res.ok) {
        delivered = true;
        break;
      }
      lastError = res.error ?? "Unknown error";
    }
    await createDeliveryRecord({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      channel,
      priority,
      metadata: input.metadata,
      deliveryStatus: delivered ? "SENT" : "FAILED",
      errorMessage: delivered ? undefined : lastError,
      attempts,
      branchId: input.branchId,
      missionId: input.missionId,
      missionTaskId: input.missionTaskId,
    });
  }
}

