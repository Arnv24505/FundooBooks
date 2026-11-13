import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { addToWishlist, getWishlist, getWishlistIds } from "@/services/wishlistService";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { objectIdSchema } from "@/validators/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const [data, ids] = await Promise.all([getWishlist(user.id), getWishlistIds(user.id)]);
    return NextResponse.json({ success: true, data, ids }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const { bookId } = z.object({ bookId: objectIdSchema }).parse(body);
    const data = await addToWishlist(user.id, bookId);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
