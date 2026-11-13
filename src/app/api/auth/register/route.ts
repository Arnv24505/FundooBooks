import { handleRouteError } from "@/lib/apiError";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { registerUser } from "@/services/authService";
import { registerSchema } from "@/validators/auth";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`register:${getClientIp(request)}`, 8, 60 * 60 * 1000);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = registerSchema.parse(body);
    const { user, tokenVersion } = await registerUser(input);
    const token = await signSessionToken({
      _id: user.id,
      role: user.role,
      tokenVersion,
    });
    const response = NextResponse.json(
      { success: true, data: user },
      { status: 201, headers: noStoreHeaders() }
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
