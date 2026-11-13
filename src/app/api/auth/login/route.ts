import { ApiError, handleRouteError } from "@/lib/apiError";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { loginUser } from "@/services/authService";
import { loginSchema } from "@/validators/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`login:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = loginSchema.parse(body);
    const { user, tokenVersion } = await loginUser(input);
    const token = await signSessionToken({ _id: user.id, role: user.role, tokenVersion });
    const response = NextResponse.json(
      { success: true, data: user },
      { headers: noStoreHeaders() }
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
