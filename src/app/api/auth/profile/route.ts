import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser, setSessionCookie, signSessionToken } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { updateProfile } from "@/services/authService";
import { updateProfileSchema } from "@/validators/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    assertSameHost(request);
    const current = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = updateProfileSchema.parse(body);
    const { user, tokenVersion } = await updateProfile(current.id, input);

    const response = NextResponse.json(
      { success: true, data: user },
      { headers: noStoreHeaders() }
    );

    // A password change bumps tokenVersion, so issue a fresh cookie.
    if (input.newPassword) {
      const token = await signSessionToken({ _id: user.id, role: user.role, tokenVersion });
      setSessionCookie(response, token);
    }
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
