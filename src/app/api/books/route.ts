import { handleRouteError } from "@/lib/apiError";
import { connectDB } from "@/lib/db";
import { listBooks } from "@/services/bookService";
import { bookQuerySchema } from "@/validators/bookQuery";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(
      [...request.nextUrl.searchParams].filter(([, value]) => value !== "")
    );
    const query = bookQuerySchema.parse(params);

    await connectDB();
    const { data, pagination } = await listBooks(query);
    return NextResponse.json(
      { success: true, data, pagination },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
