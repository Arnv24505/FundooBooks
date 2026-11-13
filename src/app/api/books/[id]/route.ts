import { handleRouteError } from "@/lib/apiError";
import { connectDB } from "@/lib/db";
import { getBookById } from "@/services/bookService";
import { listReviews } from "@/services/reviewService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const book = await getBookById(id);
    const reviews = await listReviews(id, 1, 6);
    return NextResponse.json({ success: true, data: book, reviews });
  } catch (error) {
    return handleRouteError(error);
  }
}
