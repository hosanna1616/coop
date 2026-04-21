import { prisma } from "@/lib/prisma";

type EmailPayload = {
  userId: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export async function sendEmailNotification(payload: EmailPayload): Promise<{
  ok: boolean;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "Missing RESEND config" };

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return { ok: false, error: "User has no email" };

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px;">
      <h2>${payload.title}</h2>
      <p>Hi ${user.name},</p>
      <p>${payload.message}</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Open Merchant Nation</a></p>`
          : ""
      }
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: payload.title,
      html,
    }),
  });
  if (!res.ok) return { ok: false, error: `Email API ${res.status}` };
  return { ok: true };
}

