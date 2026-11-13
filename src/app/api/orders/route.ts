import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { createOrder, listOrders } from "@/services/orderService";
import { createOrderSchema } from "@/validators/order";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await listOrders(user.id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`order:${getClientIp(request)}`, 20, 10 * 60 * 1000);
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = createOrderSchema.parse(body);
    const data = await createOrder(user.id, input);
    return NextResponse.json({ success: true, data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
