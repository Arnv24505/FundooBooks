import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/apiError";

type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets?: Map<string, Bucket>;
};

const buckets = (globalForRateLimit.rateLimitBuckets ??= new Map<string, Bucket>());

/**
 * Small fixed-window limiter. Good enough for a single Node instance and for
 * blunting credential stuffing in development; use a shared store (Upstash)
 * when running multiple serverless instances.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [storedKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(storedKey);
      }
    }
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retrySeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new ApiError(429, `Too many attempts. Try again in ${retrySeconds}s.`);
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Rejects cross-site browser writes (SameSite=Lax is the first line of defence). */
export function assertSameHost(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients (curl) have no Origin header.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      throw new ApiError(403, "Cross-site request blocked");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "Invalid origin");
  }
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    Vary: "Cookie",
  };
}
