import { clearSessionCookie } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
  } catch {
  }
  const response = NextResponse.json(
    { success: true, message: "Signed out" },
    { headers: noStoreHeaders() }
  );
  clearSessionCookie(response);
  return response;
}
