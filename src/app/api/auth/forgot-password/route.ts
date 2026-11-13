import { ApiError, handleRouteError } from "@/lib/apiError";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { createPasswordReset } from "@/services/authService";
import { forgotPasswordSchema } from "@/validators/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`forgot:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const { email } = forgotPasswordSchema.parse(body);
    await createPasswordReset(email);
    return NextResponse.json(
      {
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
