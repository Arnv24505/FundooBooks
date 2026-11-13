import { handleRouteError } from "@/lib/apiError";
import { getRelatedBooks } from "@/services/bookService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getRelatedBooks(id);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
