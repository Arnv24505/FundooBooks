import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, getClientIp, noStoreHeaders, rateLimit } from "@/lib/security";
import { addToCart, clearCart, getCart } from "@/services/cartService";
import { addToCartSchema } from "@/validators/cart";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await getCart(user.id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    rateLimit(`cart:${getClientIp(request)}`, 120, 60_000);
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = addToCartSchema.parse(body);
    const data = await addToCart(user.id, input.bookId, input.quantity);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    await clearCart(user.id);
    return NextResponse.json({ success: true }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
