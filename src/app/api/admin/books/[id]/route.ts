import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { deleteBook, getAdminBook, updateBook } from "@/services/adminBookService";
import { adminBookUpdateSchema } from "@/validators/adminBook";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await getAdminBook(id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = adminBookUpdateSchema.parse(body);
    const data = await updateBook(id, input);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    await requireAdmin();
    const { id } = await params;
    const data = await deleteBook(id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
