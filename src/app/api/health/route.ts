import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(){
    try{
        await connectDB();
        return NextResponse.json({ success: true, db: "connected"})
    }catch (error){
        console.error("Health check failed", error instanceof Error? error.message: error);
        return NextResponse.json({success: false, db:"unavailable"}, {status: 503})
    }
}