import mongoose from "mongoose"

type MongooseCache = {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
}

const globalForMongoose = globalThis as unknown as {
    mongooseCache?: MongooseCache
}

const cache: MongooseCache = (globalForMongoose.mongooseCache ??= {
    conn: null,
    promise: null,
})

export async function connectDB(): Promise<typeof mongoose> {
    if(cache.conn) return cache.conn

    const uri = process.env.MONGO_URI
    if(!uri) throw new Error("MONGODB_URI is not set")

    cache.promise ??= mongoose.connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10
    })

    try{
        cache.conn = await cache.promise
    }
    catch(error){
        cache.promise = null
        throw error
    }
    return cache.conn
}