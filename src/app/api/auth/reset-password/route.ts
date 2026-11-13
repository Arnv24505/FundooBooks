import { ApiError, handleRouteError } from "@/lib/apiError";
import { clearSessionCookie } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { resetPassword } from "@/services/authService";
import { resetPasswordSchema } from "@/validators/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`reset:${getClientIp(request)}`, 8, 60 * 60 * 1000);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = resetPasswordSchema.parse(body);
    await resetPassword(input.token, input.password);
    const response = NextResponse.json(
      { success: true, message: "Password updated. Please sign in." },
      { headers: noStoreHeaders() }
    );
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
