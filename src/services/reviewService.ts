import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { Review } from "@/models/Review";
import type { SafeUser } from "@/models/User";

async function reviewAggregate(bookId: string) {
  const result = await Review.aggregate<{ average: number; count: number }>([
    { $match: { bookId: new Types.ObjectId(bookId) } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return {
    average: Math.round((result[0]?.average ?? 0) * 10) / 10,
    count: result[0]?.count ?? 0,
  };
}

export async function listReviews(bookId: string, page = 1, limit = 10) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const filter = { bookId };
  const [data, total, summary] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    reviewAggregate(bookId),
  ]);

  return {
    data,
    summary,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function upsertReview(
  bookId: string,
  user: SafeUser,
  input: { rating: number; title?: string; comment?: string }
) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.exists({ _id: bookId });
  if (!book) throw new ApiError(404, "Book not found");

  await Review.findOneAndUpdate(
    { bookId, userId: user.id },
    {
      $set: {
        rating: input.rating,
        title: input.title || undefined,
        comment: input.comment || undefined,
        userName: user.name,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const summary = await reviewAggregate(bookId);
  await Book.updateOne(
    { _id: bookId },
    { $set: { rating: summary.average, reviewCount: summary.count } }
  );

  return listReviews(bookId);
}
