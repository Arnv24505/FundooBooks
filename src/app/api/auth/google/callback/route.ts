import { env } from "@/lib/env";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { loginWithGoogle } from "@/services/authService";
import { NextRequest, NextResponse } from "next/server";
import { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE } from "../route";

function fail(reason: string) {
  logger.warn("Google OAuth failed", { reason });
  return NextResponse.redirect(new URL("/login?error=google_failed", env.appUrl));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const next = request.cookies.get(OAUTH_NEXT_COOKIE)?.value ?? "/";

  if (!env.google.configured) return fail("not-configured");
  if (!code || !state || !storedState || state !== storedState) return fail("state-mismatch");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenResponse.ok) {
      return fail(`token-exchange-${tokenResponse.status}`);
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("missing-access-token");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!profileResponse.ok) return fail(`userinfo-${profileResponse.status}`);

    const profile = (await profileResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    const { user, tokenVersion } = await loginWithGoogle(profile);
    const token = await signSessionToken({ _id: user.id, role: user.role, tokenVersion });

    const response = NextResponse.redirect(
      new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/", env.appUrl)
    );
    setSessionCookie(response, token);
    response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: OAUTH_NEXT_COOKIE, value: "", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    logger.error("Google OAuth error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fail("exception");
  }
}
