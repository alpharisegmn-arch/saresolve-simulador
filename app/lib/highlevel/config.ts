export const HIGHLEVEL_SCOPES = [
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
  "locations/customFields.readonly",
  "opportunities.readonly",
  "opportunities.write",
] as const;

export function getHighLevelConfig() {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri =
    process.env.GHL_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/highlevel/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("A integração HighLevel ainda não possui credenciais.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: HIGHLEVEL_SCOPES.join(" "),
  };
}

export function getHighLevelInstallUrl(state: string) {
  const config = getHighLevelConfig();
  const url = new URL(
    "https://marketplace.gohighlevel.com/oauth/chooselocation",
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);
  return url.toString();
}
