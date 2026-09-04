import { env } from "cloudflare:workers";
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
  expires_at: number;
  scopes: string;
};

function database() {
  if (!env.DB) {
    throw new Error("O banco do site não está disponível.");
  }
  return env.DB;
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
  const now = Date.now();
  await database()
    .prepare(
      `INSERT INTO highlevel_installations (
        location_id, company_id, user_id, access_token, refresh_token,
        expires_at, scopes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(location_id) DO UPDATE SET
        company_id = excluded.company_id,
        user_id = excluded.user_id,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scopes = excluded.scopes,
        updated_at = excluded.updated_at`,
    )
    .bind(
      installation.locationId,
      installation.companyId,
      installation.userId,
      encryptToken(installation.accessToken),
      encryptToken(installation.refreshToken),
      installation.expiresAt.getTime(),
      installation.scopes,
      now,
      now,
    )
    .run();

  return installation;
}

export async function getInstallation(locationId?: string) {
  const statement = locationId
    ? database()
        .prepare(
          `SELECT location_id, company_id, user_id, access_token,
            refresh_token, expires_at, scopes
          FROM highlevel_installations
          WHERE location_id = ?
          LIMIT 1`,
        )
        .bind(locationId)
    : database().prepare(
        `SELECT location_id, company_id, user_id, access_token,
          refresh_token, expires_at, scopes
        FROM highlevel_installations
        ORDER BY updated_at DESC
        LIMIT 1`,
      );
  const row = await statement.first<StoredInstallation>();
  return row ? hydrate(row) : null;
}
