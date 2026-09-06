type LeadEventInput = {
  eventId: string;
  eventSourceUrl: string;
  fullName: string;
  phone: string;
  ipAddress: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
};

function normalize(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sendMetaLeadEvent(input: LeadEventInput) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return { status: "not_configured" as const };

  const nameParts = normalize(input.fullName).split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  const phone = `55${input.phone.replace(/\D/g, "")}`;

  const userData: Record<string, string> = {
    ph: await sha256(phone),
    fn: await sha256(firstName),
    country: await sha256("br"),
    // A first-party ID stable for the same phone number, distinct from event_id.
    external_id: await sha256(`saresolve:${phone}`),
  };

  if (lastName) userData.ln = await sha256(lastName);
  if (input.ipAddress) userData.client_ip_address = input.ipAddress;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: "website",
        user_data: userData,
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      },
    );
    const details = (await response.json().catch(() => null)) as
      | { events_received?: number; error?: { message?: string; code?: number } }
      | null;
    if (!response.ok) {
      console.error("Meta CAPI rejected Lead event", {
        status: response.status,
        errorCode: details?.error?.code,
        errorMessage: details?.error?.message,
      });
      return { status: "pending" as const };
    }
    console.info("Meta CAPI accepted Lead event", {
      eventsReceived: details?.events_received ?? 0,
    });
    return { status: "sent" as const };
  } catch (error) {
    console.error("Meta CAPI Lead event could not be sent", {
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: "pending" as const };
  }
}
