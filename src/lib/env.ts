/**
 * Centralised environment access.
 *
 * Values are read lazily through getters so importing this module never throws
 * during `next build` when an optional integration is not configured yet.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const env = {
  get mongoUri(): string {
    return process.env.MONGO_URI ?? process.env.MONGODB_URI ?? "";
  },
  get jwtSecret(): string {
    return process.env.JWT_SECRET ?? "";
  },
  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN ?? "7d";
  },
  get appUrl(): string {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },
  get google() {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
    return {
      clientId,
      clientSecret,
      configured: Boolean(clientId && clientSecret),
      redirectUri: `${trimTrailingSlash(
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      )}/api/auth/google/callback`,
    };
  },
  get smtp() {
    const host = process.env.SMTP_HOST ?? "";
    const user = process.env.SMTP_USER ?? "";
    const pass = process.env.SMTP_PASS ?? "";
    const from = process.env.SMTP_FROM ?? "";
    const port = Number(process.env.SMTP_PORT ?? "587");
    return {
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      user,
      pass,
      from: from || (user ? `Bookstore <${user}>` : "Bookstore <no-reply@bookstore.local>"),
      configured: Boolean(host && user && pass),
    };
  },
};

export function requireMongoUri(): string {
  if (!env.mongoUri) {
    throw new Error(
      "MongoDB connection string is missing. Set MONGO_URI (or MONGODB_URI) in .env.local."
    );
  }
  return env.mongoUri;
}

export function requireJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is missing or shorter than 32 characters.");
  }
  return env.jwtSecret;
}
