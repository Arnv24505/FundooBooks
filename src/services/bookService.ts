import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { BookQuery } from "@/validators/bookQuery";
import { isValidObjectId } from "mongoose";


const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const contains = (value: string) => new RegExp(escapeRegex(value), "i");

const SORTS = {
    popular: {downloadCount: -1, _id: -1},
    price_asc: {price: 1, _id: 1},
    price_desc: { price: -1, _id: 1 },
    rating: { rating: -1, _id: 1 },
} as const

export async function listBooks(query:BookQuery){
    const { page, limit, search, category, author, minPrice, maxPrice, sort} = query

    const conditions: Record<string, unknown>[] = []
    if(search) {
        const pattern = contains(search)
        conditions.push({
            $or: [{title: pattern }, {"authors.name": pattern}, {isbn: pattern}],
        });
    }
    if(category) conditions.push({subjects: contains(category)});
    if (author) conditions.push({ "authors.name": contains(author) });
    if (minPrice !== undefined) conditions.push({ price: { $gte: minPrice } });
    if (maxPrice !== undefined) conditions.push({ price: { $lte: maxPrice } });
    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const [data, total] = await Promise.all([
        Book.find(filter)
            .select("-formats -__v")
            .sort(SORTS[sort])
            .skip(((page -1)*limit))
            .limit(limit)
            .lean(),
        Book.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total/limit)
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page<totalPages,
            hasPreviousPage: page>1
        }
    }
}

export async function getBookById(id: string){
    if(!isValidObjectId(id)) throw new ApiError(400, "Invalid book id")
    const book = await Book.findById(id).select("-__v").lean()
    if(!book) throw new ApiError(404, "Book not found")
    return book;
}