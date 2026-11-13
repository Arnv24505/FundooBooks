import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { mergeCart } from "@/services/cartService";
import { mergeCartSchema } from "@/validators/cart";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = mergeCartSchema.parse(body);
    const data = await mergeCart(user.id, input.items);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
