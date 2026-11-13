import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { updateUserRole } from "@/services/orderService";
import { updateUserRoleSchema } from "@/validators/adminUser";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const { role } = updateUserRoleSchema.parse(body);
    const data = await updateUserRole(admin.id, id, role);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
