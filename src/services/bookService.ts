import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { BookQuery } from "@/validators/bookQuery";
import { isValidObjectId } from "mongoose";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (value: string) => new RegExp(escapeRegex(value), "i");

const SORTS = {
  popular: { downloadCount: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  rating: { rating: -1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
} as const;

export const LIST_FIELDS =
  "title authors subjects languages coverImage downloadCount price originalPrice stock rating reviewCount publisher binding createdAt";

export async function listBooks(query: BookQuery) {
  await connectDB();
  const { page, limit, search, category, author, minPrice, maxPrice, inStock, sort } = query;

  const conditions: Record<string, unknown>[] = [];
  if (search) {
    const pattern = contains(search);
    conditions.push({
      $or: [{ title: pattern }, { "authors.name": pattern }, { isbn: pattern }, { subjects: pattern }],
    });
  }
  if (category) conditions.push({ subjects: contains(category) });
  if (author) conditions.push({ "authors.name": contains(author) });
  if (minPrice !== undefined) conditions.push({ price: { $gte: minPrice } });
  if (maxPrice !== undefined) conditions.push({ price: { $lte: maxPrice } });
  if (inStock === true) conditions.push({ stock: { $gt: 0 } });
  if (inStock === false) conditions.push({ stock: { $lte: 0 } });

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  const [data, total] = await Promise.all([
    Book.find(filter)
      .select(LIST_FIELDS)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Book.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getBookById(id: string) {
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findById(id).select("-__v -formats").lean();
  if (!book) throw new ApiError(404, "Book not found");
  return book;
}

export async function getBookFacets() {
  await connectDB();
  const [subjects, authors, priceStats] = await Promise.all([
    Book.distinct("subjects"),
    Book.distinct("authors.name"),
    Book.aggregate<{ min: number; max: number }>([
      { $match: { price: { $gt: 0 } } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
  ]);

  const clean = (values: unknown[]) =>
    values
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
      .sort((a, b) => a.localeCompare(b));

  return {
    categories: clean(subjects).slice(0, 60),
    authors: clean(authors).slice(0, 80),
    priceRange: {
      min: priceStats[0]?.min ?? 0,
      max: priceStats[0]?.max ?? 5000,
    },
  };
}

export async function getRelatedBooks(id: string) {
  if (!isValidObjectId(id)) return [];
  await connectDB();
  const book = await Book.findById(id).select("subjects").lean();
  if (!book) return [];
  return Book.find({ _id: { $ne: id }, subjects: { $in: book.subjects?.slice(0, 5) ?? [] } })
    .select(LIST_FIELDS)
    .sort({ downloadCount: -1 })
    .limit(4)
    .lean();
}
