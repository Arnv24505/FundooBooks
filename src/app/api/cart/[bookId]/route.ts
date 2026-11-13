import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { removeCartItem, updateCartItem } from "@/services/cartService";
import { updateCartItemSchema } from "@/validators/cart";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const { bookId } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = updateCartItemSchema.parse(body);
    const data = await updateCartItem(user.id, bookId, input.quantity);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const { bookId } = await params;
    const data = await removeCartItem(user.id, bookId);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
