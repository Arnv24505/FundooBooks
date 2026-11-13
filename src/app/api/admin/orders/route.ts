import { handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { noStoreHeaders } from "@/lib/security";
import { listAllOrders } from "@/services/orderService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20)));
    const data = await listAllOrders({
      page,
      limit,
      status: params.get("status") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    return NextResponse.json({ success: true, ...data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
