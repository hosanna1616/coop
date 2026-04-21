type WebPushPayload = {
  endpoint?: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export async function sendWebPushNotification(
  payload: WebPushPayload,
): Promise<{ ok: boolean; error?: string }> {
  const gatewayUrl = process.env.PUSH_GATEWAY_URL;
  if (!gatewayUrl) {
    return { ok: false, error: "Missing PUSH_GATEWAY_URL" };
  }
  if (!payload.endpoint) {
    return { ok: false, error: "No web push endpoint saved for user" };
  }

  const res = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PUSH_GATEWAY_TOKEN ?? ""}`,
    },
    body: JSON.stringify({
      endpoint: payload.endpoint,
      title: payload.title,
      body: payload.message,
      url: payload.actionUrl,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
    }),
  });
  if (!res.ok) return { ok: false, error: `Push gateway ${res.status}` };
  return { ok: true };
}

