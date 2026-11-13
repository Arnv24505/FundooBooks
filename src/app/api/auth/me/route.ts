import { handleRouteError } from "@/lib/apiError";
import { getCurrentUser } from "@/lib/auth";
import { noStoreHeaders } from "@/lib/security";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ success: true, data: user }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
