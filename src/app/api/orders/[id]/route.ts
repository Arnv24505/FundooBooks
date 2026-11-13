import { handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { noStoreHeaders } from "@/lib/security";
import { getOrder } from "@/services/orderService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = await getOrder(user.id, id, user.role === "admin");
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
