import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getHighLevelInstallUrl } from "../../../../lib/highlevel/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = randomBytes(32).toString("base64url");
    const cookieStore = await cookies();
    cookieStore.set("ghl_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Allow enough time for login, account selection and consent.
      maxAge: 30 * 60,
      path: "/",
    });
    return Response.redirect(getHighLevelInstallUrl(state));
  } catch {
    return Response.json(
      { error: "A integração HighLevel ainda não foi configurada." },
      { status: 503 },
    );
  }
}
