import { ApiError, handleRouteError } from "@/lib/apiError";
import { requireUser } from "@/lib/auth";
import { assertSameHost, noStoreHeaders } from "@/lib/security";
import { deleteAddress, updateAddress } from "@/services/addressService";
import { updateAddressSchema } from "@/validators/address";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameHost(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });
    const input = updateAddressSchema.parse(body);
    const data = await updateAddress(user.id, id, input);
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
    const user = await requireUser();
    const { id } = await params;
    const data = await deleteAddress(user.id, id);
    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders() });
  } catch (error) {
    return handleRouteError(error);
  }
}
