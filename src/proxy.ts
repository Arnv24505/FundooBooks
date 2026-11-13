import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bookstore_session";
const AUTH_PAGES = new Set(["/login", "/signup"]);

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Optimistic page guard. Every API route re-checks the session against MongoDB,
 * so this only prevents rendering protected shells for signed-out visitors.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!process.env.JWT_SECRET) return NextResponse.next();

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (AUTH_PAGES.has(pathname)) {
    if (session) {
      return NextResponse.redirect(
        new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url)
      );
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/profile/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/checkout/:path*",
  ],
};
