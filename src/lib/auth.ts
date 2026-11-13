import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { env, requireJwtSecret } from "@/lib/env";
import { ApiError } from "@/lib/apiError";
import { User, toSafeUser, type SafeUser } from "@/models/User";

export const SESSION_COOKIE = "bookstore_session";
const BCRYPT_ROUNDS = 12;

type TokenPayload = {
  sub: string;
  role: "user" | "admin";
  tv: number;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(requireJwtSecret());
}

function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) return 60 * 60 * 24 * 7;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 86400);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(user: {
  _id: unknown;
  role: "user" | "admin";
  tokenVersion?: number | null;
}): Promise<string> {
  return new SignJWT({
    role: user.role,
    tv: user.tokenVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secretKey());
}

async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: payload.role === "admin" ? "admin" : "user",
      tv: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: durationToSeconds(env.jwtExpiresIn),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}

/** Returns the signed-in user, or null. Always validates against the DB. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  await connectDB();
  const user = await User.findById(payload.sub).lean();
  if (!user) return null;
  if ((user.tokenVersion ?? 0) !== payload.tv) return null;

  return toSafeUser(user);
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue");
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "Admin access required");
  return user;
}
