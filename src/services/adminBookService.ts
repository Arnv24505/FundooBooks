import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { Cart } from "@/models/Cart";
import { Review } from "@/models/Review";
import { StockAlert } from "@/models/StockAlert";
import { Wishlist } from "@/models/Wishlist";
import { notifyStockAlerts } from "@/services/stockAlertService";
import type { AdminBookInput } from "@/validators/adminBook";

export async function listAdminBooks(options: {
  page: number;
  limit: number;
  search?: string;
  lowStock?: boolean;
}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options.search) {
    const pattern = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: pattern }, { "authors.name": pattern }, { isbn: pattern }];
  }
  if (options.lowStock) filter.stock = { $lte: 3 };

  const [data, total] = await Promise.all([
    Book.find(filter)
      .select(
        "title authors coverImage price originalPrice stock rating reviewCount isbn publisher binding sourceId isDemoData createdAt"
      )
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean(),
    Book.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function createBook(input: AdminBookInput) {
  await connectDB();
  const book = await Book.create({
    ...input,
    sourceId: -Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000),
    authors: input.authors.map((author) => ({ name: author.name })),
    originalPrice: input.originalPrice || undefined,
    coverImage: input.coverImage || undefined,
    description: input.description || undefined,
    isDemoData: true,
    rating: 0,
    reviewCount: 0,
  });
  return book.toObject();
}

export async function getAdminBook(bookId: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findById(bookId).lean();
  if (!book) throw new ApiError(404, "Book not found");
  return book;
}

export async function updateBook(bookId: string, input: Partial<AdminBookInput> & { rating?: number }) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findById(bookId);
  if (!book) throw new ApiError(404, "Book not found");

  const wasOutOfStock = (book.stock ?? 0) <= 0;
  Object.assign(book, input);
  await book.save();

  if (wasOutOfStock && (book.stock ?? 0) > 0) {
    await notifyStockAlerts(String(book._id), book.title, env.appUrl);
  }

  return book.toObject();
}

export async function deleteBook(bookId: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findByIdAndDelete(bookId);
  if (!book) throw new ApiError(404, "Book not found");

  await Promise.all([
    Cart.updateMany({}, { $pull: { items: { bookId: book._id } } }),
    Wishlist.updateMany({}, { $pull: { bookIds: book._id } }),
    Review.deleteMany({ bookId: book._id }),
    StockAlert.deleteMany({ bookId: book._id }),
  ]);

  return { deleted: true };
}
