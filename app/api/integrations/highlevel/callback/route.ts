import { cookies } from "next/headers";
import { exchangeAuthorizationCode } from "../../../../lib/highlevel/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${url.protocol}//${url.host}`;
  const destination = new URL("/integracao/highlevel", appUrl);

  if (error) {
    destination.searchParams.set("status", "denied");
    return Response.redirect(destination);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ghl_oauth_state")?.value;
  cookieStore.delete("ghl_oauth_state");

  if (
    !code ||
    !expectedState ||
    (state !== null && state !== expectedState)
  ) {
    destination.searchParams.set("status", "invalid");
    return Response.redirect(destination);
  }

  try {
    const installation = await exchangeAuthorizationCode(code);
    destination.searchParams.set("status", "success");
    destination.searchParams.set("location", installation.locationId);
  } catch {
    destination.searchParams.set("status", "error");
  }
  return Response.redirect(destination);
}
