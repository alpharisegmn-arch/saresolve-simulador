import postgres from "postgres";
import { decryptToken, encryptToken } from "./crypto";

export type HighLevelInstallation = {
  locationId: string;
  companyId: string | null;
  userId: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string;
};

type StoredInstallation = {
  location_id: string;
  company_id: string | null;
  user_id: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scopes: string;
};

let database: ReturnType<typeof postgres> | undefined;
let schemaReady: Promise<void> | undefined;

function sql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não foi configurada.");
  }
  database ??= postgres(connectionString, {
    max: 2,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return database;
}

async function ensureSchema() {
  schemaReady ??= (async () => {
    await sql()`
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
      )
    `;
  })();
  return schemaReady;
}

function hydrate(row: StoredInstallation): HighLevelInstallation {
  return {
    locationId: row.location_id,
    companyId: row.company_id,
    userId: row.user_id,
    accessToken: decryptToken(row.access_token),
    refreshToken: decryptToken(row.refresh_token),
    expiresAt: new Date(row.expires_at),
    scopes: row.scopes,
  };
}

export async function saveInstallation(installation: HighLevelInstallation) {
  await ensureSchema();
  const [row] = await sql()<StoredInstallation[]>`
    insert into highlevel_installations (
      location_id, company_id, user_id, access_token, refresh_token,
      expires_at, scopes, updated_at
    ) values (
      ${installation.locationId},
      ${installation.companyId},
      ${installation.userId},
      ${encryptToken(installation.accessToken)},
      ${encryptToken(installation.refreshToken)},
      ${installation.expiresAt},
      ${installation.scopes},
      now()
    )
    on conflict (location_id) do update set
      company_id = excluded.company_id,
      user_id = excluded.user_id,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      scopes = excluded.scopes,
      updated_at = now()
    returning *
  `;
  return hydrate(row);
}

export async function getInstallation(locationId?: string) {
  await ensureSchema();
  const rows = locationId
    ? await sql()<StoredInstallation[]>`
        select * from highlevel_installations
        where location_id = ${locationId}
        limit 1
      `
    : await sql()<StoredInstallation[]>`
        select * from highlevel_installations
        order by updated_at desc
        limit 1
      `;
  return rows[0] ? hydrate(rows[0]) : null;
}
