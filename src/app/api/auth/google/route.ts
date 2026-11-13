import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export const OAUTH_STATE_COOKIE = "bookstore_oauth_state";
export const OAUTH_NEXT_COOKIE = "bookstore_oauth_next";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  if (!env.google.configured) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", env.appUrl));
  }

  const state = randomBytes(24).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.google.clientId);
  authUrl.searchParams.set("redirect_uri", env.google.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  const secure = env.isProduction;
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });
  response.cookies.set({
    name: OAUTH_NEXT_COOKIE,
    value: safeNext(request.nextUrl.searchParams.get("next")),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });
  return response;
}
