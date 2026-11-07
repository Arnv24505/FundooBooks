import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { logger } from "@/lib/logger"

export class ApiError extends Error {
    status: number

    constructor(status: number, message: string){
        super(message)
        this.status = status
    }
}

export function handleRouteError(error: unknown): NextResponse{
    if(error instanceof ApiError){
        return NextResponse.json(
            {success: false, error: {message: error.message}},
            {status: error.status}
        )
    }
    
    if(error instanceof ZodError){
        const details = error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }))
        return NextResponse.json(
            {success: false, error: {message: "Invalid request", details}},
            {status: 400}
        )
    }

    logger.error("Unhandled API error", {
        error: error instanceof Error?(error.stack??error.message):String(error),
    })
    return NextResponse.json(
        {success: false, error:{message:"Internal server error"}},
        {status: 500}
    )
}