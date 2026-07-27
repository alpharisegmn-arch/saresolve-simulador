import { z } from "zod";
import { getHighLevelConfig } from "./config";
import {
  getInstallation,
  saveInstallation,
  type HighLevelInstallation,
} from "./store";

const tokenResponseSchema = z
  .object({
    access_token: z.string().optional(),
    accessToken: z.string().optional(),
    refresh_token: z.string().optional(),
    refreshToken: z.string().optional(),
    expires_in: z.number().optional(),
    expiresIn: z.number().optional(),
    scope: z.string().optional().default(""),
    locationId: z.string().optional(),
    companyId: z.string().optional(),
    userId: z.string().optional(),
  })
  .transform((value) => ({
    accessToken: value.accessToken ?? value.access_token ?? "",
    refreshToken: value.refreshToken ?? value.refresh_token ?? "",
    expiresIn: value.expiresIn ?? value.expires_in ?? 86_400,
    scope: value.scope,
    locationId: value.locationId,
    companyId: value.companyId,
    userId: value.userId,
  }))
  .refine((value) => value.accessToken && value.refreshToken, {
    message: "Resposta OAuth sem os tokens esperados.",
  });

async function requestToken(body: Record<string, string>) {
  const response = await fetch(
    "https://services.leadconnectorhq.com/oauth/token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Version: "v3",
      },
      body: new URLSearchParams(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha no OAuth HighLevel (${response.status}): ${details}`);
  }
  return tokenResponseSchema.parse(await response.json());
}

export async function exchangeAuthorizationCode(code: string) {
  const config = getHighLevelConfig();
  const token = await requestToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    grantType: "authorization_code",
    code,
    userType: "Location",
    redirectUri: config.redirectUri,
  });
  if (!token.locationId) {
    throw new Error("O HighLevel não retornou a subconta instalada.");
  }
  return saveInstallation({
    locationId: token.locationId,
    companyId: token.companyId ?? null,
    userId: token.userId ?? null,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: new Date(Date.now() + token.expiresIn * 1000),
    scopes: token.scope,
  });
}

export async function refreshInstallation(
  installation: HighLevelInstallation,
) {
  const config = getHighLevelConfig();
  const token = await requestToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    grantType: "refresh_token",
    refreshToken: installation.refreshToken,
    userType: "Location",
    redirectUri: config.redirectUri,
  });
  return saveInstallation({
    ...installation,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: new Date(Date.now() + token.expiresIn * 1000),
    scopes: token.scope || installation.scopes,
  });
}

export async function getUsableInstallation(locationId?: string) {
  const installation = await getInstallation(
    locationId ?? process.env.GHL_LOCATION_ID,
  );
  if (!installation) return null;

  const refreshBefore = Date.now() + 5 * 60 * 1000;
  if (installation.expiresAt.getTime() <= refreshBefore) {
    return refreshInstallation(installation);
  }
  return installation;
}
