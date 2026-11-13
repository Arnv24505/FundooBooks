import { handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { removeFromWishlist } from "@/services/wishlistService";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const { bookId } = await params;
    const data = await removeFromWishlist(user.id, bookId);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
