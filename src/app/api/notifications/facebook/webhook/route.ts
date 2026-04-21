import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateNotificationPreferences } from "@/backend/services/notification-preferences-service";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = req.nextUrl.searchParams.get("hub.verify_token");
  if (
    mode === "subscribe" &&
    verifyToken &&
    verifyToken === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "ok");
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const event of messaging) {
      const senderId = event?.sender?.id ? String(event.sender.id) : "";
      const text = event?.message?.text ? String(event.message.text) : "";
      if (!senderId || !text.startsWith("CONNECT ")) continue;
      const userId = text.replace("CONNECT ", "").trim();
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) continue;
      const pref = await getOrCreateNotificationPreferences(user.id);
      const channels = { ...pref.channelsNormalized };
      channels.FACEBOOK.enabled = true;
      channels.FACEBOOK.facebookPsid = senderId;
      await prisma.userNotificationPreference.update({
        where: { userId: user.id },
        data: { channels: channels as unknown as object },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

