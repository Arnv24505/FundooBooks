import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { Wishlist } from "@/models/Wishlist";
import { LIST_FIELDS } from "@/services/bookService";

export async function getWishlist(userId: string) {
  await connectDB();
  const wishlist = await Wishlist.findOne({ userId }).lean();
  const ids = wishlist?.bookIds ?? [];
  if (ids.length === 0) return { items: [] };

  const books = await Book.find({ _id: { $in: ids } })
    .select(LIST_FIELDS)
    .lean();
  const bookMap = new Map(books.map((book) => [String(book._id), book]));
  const items = ids
    .map((id) => bookMap.get(String(id)))
    .filter((book): book is NonNullable<typeof book> => Boolean(book));

  return { items };
}

export async function getWishlistIds(userId: string): Promise<string[]> {
  await connectDB();
  const wishlist = await Wishlist.findOne({ userId }).select("bookIds").lean();
  return (wishlist?.bookIds ?? []).map(String);
}

export async function addToWishlist(userId: string, bookId: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.exists({ _id: bookId });
  if (!book) throw new ApiError(404, "Book not found");

  await Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { bookIds: bookId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  return getWishlist(userId);
}

export async function removeFromWishlist(userId: string, bookId: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  await Wishlist.updateOne({ userId }, { $pull: { bookIds: bookId } });
  return getWishlist(userId);
}
