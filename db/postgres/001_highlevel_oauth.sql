create table if not exists highlevel_installations (
  location_id text primary key,
  company_id text,
  user_id text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
