import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  householdIncomeCents: integer("household_income_cents").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  availableEntryCents: integer("available_entry_cents").notNull(),
  creditType: text("credit_type").notNull(),
  desiredCreditCents: integer("desired_credit_cents").notNull(),
  idealInstallmentCents: integer("ideal_installment_cents").notNull(),
  consortiumMonths: integer("consortium_months").notNull(),
  financingMonths: integer("financing_months").notNull(),
  ratesSnapshot: text("rates_snapshot").notNull(),
  resultSnapshot: text("result_snapshot").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  gclid: text("gclid"),
  fbclid: text("fbclid"),
  sourcePage: text("source_page"),
  referrer: text("referrer"),
  consent: integer("consent", { mode: "boolean" }).notNull(),
  consentVersion: text("consent_version").notNull(),
  consentAt: text("consent_at").notNull(),
  webhookStatus: text("webhook_status").notNull().default("not_configured"),
  webhookAttempts: integer("webhook_attempts").notNull().default(0),
  specialistInterest: integer("specialist_interest", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const leadRateLimits = sqliteTable("lead_rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  count: integer("count").notNull().default(1),
});
