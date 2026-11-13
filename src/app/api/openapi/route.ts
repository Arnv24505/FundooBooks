import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";

export async function GET() {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
