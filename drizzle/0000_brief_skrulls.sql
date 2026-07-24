CREATE TABLE `lead_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`household_income_cents` integer NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`available_entry_cents` integer NOT NULL,
	`credit_type` text NOT NULL,
	`desired_credit_cents` integer NOT NULL,
	`ideal_installment_cents` integer NOT NULL,
	`consortium_months` integer NOT NULL,
	`financing_months` integer NOT NULL,
	`rates_snapshot` text NOT NULL,
	`result_snapshot` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_term` text,
	`utm_content` text,
	`gclid` text,
	`fbclid` text,
	`source_page` text,
	`referrer` text,
	`consent` integer NOT NULL,
	`consent_version` text NOT NULL,
	`consent_at` text NOT NULL,
	`webhook_status` text DEFAULT 'not_configured' NOT NULL,
	`webhook_attempts` integer DEFAULT 0 NOT NULL,
	`specialist_interest` integer DEFAULT false NOT NULL
);
