import { prisma } from "@/lib/prisma";

export type ChannelName =
  | "IN_APP"
  | "EMAIL"
  | "TELEGRAM"
  | "WHATSAPP"
  | "FACEBOOK"
  | "WEB_PUSH";

export type ChannelConfig = {
  enabled: boolean;
  telegramChatId?: string;
  whatsappPhone?: string;
  facebookPsid?: string;
  webPushEndpoint?: string;
};

export type ChannelPreferences = Record<ChannelName, ChannelConfig>;

const DEFAULT_CHANNELS: ChannelPreferences = {
  IN_APP: { enabled: true },
  EMAIL: { enabled: true },
  TELEGRAM: { enabled: false },
  WHATSAPP: { enabled: false },
  FACEBOOK: { enabled: false },
  WEB_PUSH: { enabled: true },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeChannels(raw: unknown): ChannelPreferences {
  if (!isObject(raw)) return DEFAULT_CHANNELS;
  const out: ChannelPreferences = { ...DEFAULT_CHANNELS };
  (Object.keys(DEFAULT_CHANNELS) as ChannelName[]).forEach((k) => {
    const v = raw[k];
    if (!isObject(v)) return;
    out[k] = {
      ...out[k],
      enabled: Boolean(v.enabled),
      telegramChatId:
        typeof v.telegramChatId === "string" ? v.telegramChatId : undefined,
      whatsappPhone:
        typeof v.whatsappPhone === "string" ? v.whatsappPhone : undefined,
      facebookPsid:
        typeof v.facebookPsid === "string" ? v.facebookPsid : undefined,
      webPushEndpoint:
        typeof v.webPushEndpoint === "string" ? v.webPushEndpoint : undefined,
    };
  });
  return out;
}

export async function getOrCreateNotificationPreferences(userId: string) {
  const row = await prisma.userNotificationPreference.findUnique({
    where: { userId },
  });

  if (row) {
    return {
      ...row,
      channelsNormalized: normalizeChannels(row.channels),
    };
  }

  const created = await prisma.userNotificationPreference.create({
    data: {
      userId,
      channels: DEFAULT_CHANNELS as unknown as object,
    },
  });
  return {
    ...created,
    channelsNormalized: DEFAULT_CHANNELS,
  };
}

export function isInQuietHours(
  now: Date,
  quietStart: string,
  quietEnd: string,
): boolean {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map((x) => Number(x));
    return h * 60 + m;
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(quietStart);
  const end = toMinutes(quietEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

