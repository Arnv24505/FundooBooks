import { handleRouteError } from "@/lib/apiError";
import { getBookFacets } from "@/services/bookService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getBookFacets();
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
