import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { createAddress, listAddresses } from "@/services/addressService";
import { addressSchema } from "@/validators/address";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await listAddresses(user.id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = addressSchema.parse(body);
    const data = await createAddress(user.id, input);
    return NextResponse.json({ success: true, data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
