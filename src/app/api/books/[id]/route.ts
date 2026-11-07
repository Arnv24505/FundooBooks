import { handleRouteError } from "@/lib/apiError";
import { connectDB } from "@/lib/db";
import { getBookById } from "@/services/bookService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _request: NextRequest,
    {params}: {params: Promise<{id: string}>}
){
    try{
        const {id} = await params
        await connectDB()
        const book = await getBookById(id)
        return NextResponse.json({success: true, data: book})
    }catch(error){
        return handleRouteError(error)
    }
}
