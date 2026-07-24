import { and, eq, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { SITE_CONFIG } from "../../config";
import { calculateComparison } from "../../finance";
import { getDb } from "../../../db";
import { leadRateLimits, leads } from "../../../db/schema";

export const runtime = "edge";

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

type RuntimeEnvironment = {
  DB?: D1Database;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
};

async function ensureSchema() {
  const runtimeEnv = env as RuntimeEnvironment;
  if (!runtimeEnv.DB) return;

  await runtimeEnv.DB.batch([
    runtimeEnv.DB.prepare(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        household_income_cents INTEGER NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        available_entry_cents INTEGER NOT NULL,
        credit_type TEXT NOT NULL,
        desired_credit_cents INTEGER NOT NULL,
        ideal_installment_cents INTEGER NOT NULL,
        consortium_months INTEGER NOT NULL,
        financing_months INTEGER NOT NULL,
        rates_snapshot TEXT NOT NULL,
        result_snapshot TEXT NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        gclid TEXT,
        fbclid TEXT,
        source_page TEXT,
        referrer TEXT,
        consent INTEGER NOT NULL,
        consent_version TEXT NOT NULL,
        consent_at TEXT NOT NULL,
        webhook_status TEXT NOT NULL DEFAULT 'not_configured',
        webhook_attempts INTEGER NOT NULL DEFAULT 0,
        specialist_interest INTEGER NOT NULL DEFAULT 0
      )
    `),
    runtimeEnv.DB.prepare(`
      CREATE TABLE IF NOT EXISTS lead_rate_limits (
        key TEXT PRIMARY KEY NOT NULL,
        window_started_at INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1
      )
    `),
    runtimeEnv.DB.prepare(
      "CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at)",
    ),
    runtimeEnv.DB.prepare(
      "CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone)",
    ),
  ]);
}

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
  const db = getDb();
  const key = await hashRateLimitKey(request);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const limit = 8;
  await db
    .delete(leadRateLimits)
    .where(lt(leadRateLimits.windowStartedAt, now - windowMs));
  const [row] = await db
    .select()
    .from(leadRateLimits)
    .where(eq(leadRateLimits.key, key))
    .limit(1);

  if (!row) {
    await db.insert(leadRateLimits).values({ key, windowStartedAt: now, count: 1 });
    return false;
  }
  if (row.count >= limit) return true;
  await db
    .update(leadRateLimits)
    .set({ count: row.count + 1 })
    .where(
      and(
        eq(leadRateLimits.key, key),
        eq(leadRateLimits.windowStartedAt, row.windowStartedAt),
      ),
    );
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

  try {
    await ensureSchema();
    if (await isRateLimited(request)) {
      return Response.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      );
    }

    const db = getDb();
    const ratesSnapshot = JSON.stringify(SITE_CONFIG.credit[parsed.creditType]);
    await db.insert(leads).values({
      id: leadId,
      fullName: parsed.fullName,
      phone: parsed.phone,
      email: parsed.email || null,
      householdIncomeCents: Math.round(parsed.householdIncome * 100),
      city: parsed.city,
      state: parsed.state.toUpperCase(),
      availableEntryCents: Math.round(parsed.availableEntry * 100),
      creditType: parsed.creditType,
      desiredCreditCents: Math.round(parsed.desiredCredit * 100),
      idealInstallmentCents: Math.round(parsed.idealInstallment * 100),
      consortiumMonths: result.consortium.months,
      financingMonths: result.financing.months,
      ratesSnapshot,
      resultSnapshot: JSON.stringify(result),
      utmSource: parsed.tracking.utmSource || null,
      utmMedium: parsed.tracking.utmMedium || null,
      utmCampaign: parsed.tracking.utmCampaign || null,
      utmTerm: parsed.tracking.utmTerm || null,
      utmContent: parsed.tracking.utmContent || null,
      gclid: parsed.tracking.gclid || null,
      fbclid: parsed.tracking.fbclid || null,
      sourcePage: parsed.tracking.sourcePage || null,
      referrer: parsed.tracking.referrer || null,
      consent: true,
      consentVersion: SITE_CONFIG.consentVersion,
      consentAt,
      webhookStatus,
    });
    persisted = true;

    const runtimeEnv = env as RuntimeEnvironment;
    if (runtimeEnv.LEAD_WEBHOOK_URL) {
      webhookStatus = "pending";
      const payload = JSON.stringify({
        id: leadId,
        createdAt: consentAt,
        lead: {
          fullName: parsed.fullName,
          phone: parsed.phone,
          email: parsed.email || null,
          city: parsed.city,
          state: parsed.state.toUpperCase(),
        },
        simulation: result,
        tracking: parsed.tracking,
      });
      try {
        const signature = runtimeEnv.LEAD_WEBHOOK_SECRET
          ? await signPayload(payload, runtimeEnv.LEAD_WEBHOOK_SECRET)
          : "";
        const response = await fetch(runtimeEnv.LEAD_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(signature ? { "x-saresolve-signature": signature } : {}),
          },
          body: payload,
        });
        webhookStatus = response.ok ? "sent" : "pending";
      } catch {
        webhookStatus = "pending";
      }
      await db
        .update(leads)
        .set({ webhookStatus, webhookAttempts: 1 })
        .where(eq(leads.id, leadId));
    }
  } catch {
    // The comparison remains available even if persistence is temporarily down.
    // PII is deliberately not written to browser storage or application logs.
  }

  return Response.json({
    id: leadId,
    persisted,
    webhookStatus,
    result,
  });
}
