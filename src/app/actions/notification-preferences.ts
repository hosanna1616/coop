"use server";

import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ChannelName,
  getOrCreateNotificationPreferences,
} from "@/backend/services/notification-preferences-service";

type UpdateInput = {
  maxPerDay?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  channels?: Partial<Record<ChannelName, { enabled: boolean }>>;
  telegramChatId?: string;
  whatsappPhone?: string;
  facebookPsid?: string;
  webPushEndpoint?: string;
};

export async function getMyNotificationPreferences() {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "getMyNotificationPreferences",
  );
  const pref = await getOrCreateNotificationPreferences(session.id);
  return {
    maxPerDay: pref.maxPerDay,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
    channels: pref.channelsNormalized,
  };
}

export async function updateMyNotificationPreferences(input: UpdateInput) {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "updateMyNotificationPreferences",
  );
  const pref = await getOrCreateNotificationPreferences(session.id);
  const channels = { ...pref.channelsNormalized };
  (Object.keys(input.channels ?? {}) as ChannelName[]).forEach((k) => {
    const enabled = input.channels?.[k]?.enabled;
    if (typeof enabled === "boolean") channels[k] = { ...channels[k], enabled };
  });
  if (typeof input.telegramChatId === "string") {
    channels.TELEGRAM.telegramChatId = input.telegramChatId;
  }
  if (typeof input.whatsappPhone === "string") {
    channels.WHATSAPP.whatsappPhone = input.whatsappPhone;
  }
  if (typeof input.facebookPsid === "string") {
    channels.FACEBOOK.facebookPsid = input.facebookPsid;
  }
  if (typeof input.webPushEndpoint === "string") {
    channels.WEB_PUSH.webPushEndpoint = input.webPushEndpoint;
  }

  await prisma.userNotificationPreference.update({
    where: { userId: session.id },
    data: {
      maxPerDay:
        typeof input.maxPerDay === "number"
          ? Math.max(1, Math.min(30, Math.round(input.maxPerDay)))
          : pref.maxPerDay,
      quietHoursStart: input.quietHoursStart ?? pref.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd ?? pref.quietHoursEnd,
      channels: channels as unknown as object,
    },
  });
  return { ok: true as const };
}

