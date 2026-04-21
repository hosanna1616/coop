type FacebookPayload = {
  psid: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export async function sendFacebookNotification(
  payload: FacebookPayload,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "Missing FACEBOOK_PAGE_ACCESS_TOKEN" };

  const quickReplies = payload.actionUrl
    ? [
        {
          content_type: "text",
          title: "Scout Now",
          payload: `OPEN:${payload.actionUrl}`,
        },
      ]
    : undefined;

  const res = await fetch("https://graph.facebook.com/v22.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: payload.psid },
      message: {
        text: `${payload.title}\n${payload.message}`,
        quick_replies: quickReplies,
      },
    }),
  });
  if (!res.ok) return { ok: false, error: `Facebook API ${res.status}` };
  return { ok: true };
}

