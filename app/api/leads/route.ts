import { z } from "zod";
import { SITE_CONFIG } from "../../config";
import { calculateComparison } from "../../finance";

export const runtime = "nodejs";

const trackingSchema = z
  .object({
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
    utmTerm: z.string().max(200).optional(),
    utmContent: z.string().max(200).optional(),
    gclid: z.string().max(300).optional(),
    fbclid: z.string().max(300).optional(),
    sourcePage: z.string().max(1000).optional(),
    referrer: z.string().max(1000).optional(),
  })
  .optional()
  .default({});

const leadSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 10 || value.length === 11),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  householdIncome: z.number().finite().min(0).max(100_000_000),
  city: z.string().trim().max(100).optional().default(""),
  state: z.string().trim().max(2).optional().default(""),
  availableEntry: z.number().finite().min(0).max(100_000_000),
  creditType: z.enum(["property", "vehicle"]),
  desiredCredit: z.number().finite().positive(),
  idealInstallment: z.number().finite().positive(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  tracking: trackingSchema,
});

const rateLimitStore = new Map<string, { count: number; startedAt: number }>();

async function hashRateLimitKey(request: Request) {
  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "local";
  const bytes = new TextEncoder().encode(address);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isRateLimited(request: Request) {
  const key = await hashRateLimitKey(request);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const limit = 8;

  const row = rateLimitStore.get(key);
  if (!row || row.startedAt < now - windowMs) {
    rateLimitStore.set(key, { count: 1, startedAt: now });
    return false;
  }
  if (row.count >= limit) return true;
  rateLimitStore.set(key, { ...row, count: row.count + 1 });
  return false;
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof leadSchema>;
  try {
    parsed = leadSchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: "Confira os dados informados e tente novamente." },
      { status: 400 },
    );
  }

  const bounds = SITE_CONFIG.credit[parsed.creditType];
  if (
    parsed.desiredCredit < bounds.min ||
    parsed.desiredCredit > bounds.max
  ) {
    return Response.json(
      { error: "O valor do crédito está fora da faixa disponível." },
      { status: 400 },
    );
  }
  if (
    parsed.creditType === "vehicle" &&
    parsed.availableEntry >= parsed.desiredCredit
  ) {
    return Response.json(
      { error: "A entrada deve ser menor que o valor do automóvel." },
      { status: 400 },
    );
  }

  const result = calculateComparison({
    creditType: parsed.creditType,
    creditValue: parsed.desiredCredit,
    idealInstallment: parsed.idealInstallment,
    availableEntry: parsed.availableEntry,
  });
  const leadId = crypto.randomUUID();
  const consentAt = new Date().toISOString();
  let persisted = false;
  let webhookStatus = "not_configured";

  if (await isRateLimited(request)) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    webhookStatus = "pending";
    const payload = JSON.stringify({
      id: leadId,
      createdAt: consentAt,
      lead: {
        fullName: parsed.fullName,
        phone: parsed.phone,
        email: parsed.email || null,
        householdIncome: parsed.householdIncome,
        city: parsed.city,
        state: parsed.state.toUpperCase(),
      },
      request: {
        availableEntry: parsed.availableEntry,
        creditType: parsed.creditType,
        desiredCredit: parsed.desiredCredit,
        idealInstallment: parsed.idealInstallment,
      },
      simulation: result,
      tracking: parsed.tracking,
      consent: {
        version: SITE_CONFIG.consentVersion,
        acceptedAt: consentAt,
      },
    });

    try {
      const webhookSecret = process.env.LEAD_WEBHOOK_SECRET;
      const signature = webhookSecret
        ? await signPayload(payload, webhookSecret)
        : "";
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(signature ? { "x-saresolve-signature": signature } : {}),
        },
        body: payload,
      });
      webhookStatus = response.ok ? "sent" : "pending";
      persisted = response.ok;
    } catch {
      webhookStatus = "pending";
    }
  }

  return Response.json({
    id: leadId,
    persisted,
    webhookStatus,
    result,
  });
}
