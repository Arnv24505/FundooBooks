import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { getOrder, updateOrderStatus } from "@/services/orderService";
import { updateOrderStatusSchema } from "@/validators/order";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await getOrder("", id, true);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const { status } = updateOrderStatusSchema.parse(body);
    const data = await updateOrderStatus(id, status);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
