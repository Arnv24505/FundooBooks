import { handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { noStoreHeaders } from "@/lib/security";
import { getAdminStats } from "@/services/orderService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminStats();
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
