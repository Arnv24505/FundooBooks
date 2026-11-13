import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { createStockAlert } from "@/services/stockAlertService";
import { stockAlertSchema } from "@/validators/review";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`stock-alert:${getClientIp(request)}`, 20, 60 * 60 * 1000);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = stockAlertSchema.parse(body);
    const user = await requireUser().catch(() => null);
    const data = await createStockAlert(input.bookId, input.email, user?.id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
