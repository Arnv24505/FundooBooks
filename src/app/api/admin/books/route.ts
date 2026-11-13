import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireAdmin } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { createBook, listAdminBooks } from "@/services/adminBookService";
import { adminBookCreateSchema } from "@/validators/adminBook";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20)));
    const data = await listAdminBooks({
      page,
      limit,
      search: params.get("search") ?? undefined,
      lowStock: params.get("lowStock") === "true",
    });
    return NextResponse.json({ success: true, ...data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    await requireAdmin();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = adminBookCreateSchema.parse(body);
    const data = await createBook(input);
    return NextResponse.json({ success: true, data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
