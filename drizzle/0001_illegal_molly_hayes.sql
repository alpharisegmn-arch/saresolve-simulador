CREATE TABLE `highlevel_installations` (
	`location_id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`user_id` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
