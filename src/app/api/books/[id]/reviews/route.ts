import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, getClientIp, rateLimit } from "@/lib/security";
import { listReviews, upsertReview } from "@/services/reviewService";
import { reviewSchema } from "@/validators/review";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const data = await listReviews(id, page, 10);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    rateLimit(`review:${getClientIp(request)}`, 20, 60 * 60 * 1000);
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = reviewSchema.parse(body);
    const data = await upsertReview(id, user, input);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return handleRouteError(error);
  }
}
