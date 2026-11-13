import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { Book } from "@/models/Book";
import { StockAlert } from "@/models/StockAlert";

export async function createStockAlert(bookId: string, email: string, userId?: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findById(bookId).select("title stock").lean();
  if (!book) throw new ApiError(404, "Book not found");
  if ((book.stock ?? 0) > 0) throw new ApiError(409, "This title is already in stock");

  await StockAlert.findOneAndUpdate(
    { bookId, email },
    { $set: { userId: userId || undefined } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return { subscribed: true };
}

export async function notifyStockAlerts(bookId: string, title: string, appUrl: string) {
  await connectDB();
  const { queueEmail } = await import("@/lib/mailer");
  const alerts = await StockAlert.find({ bookId, notifiedAt: { $exists: false } }).lean();
  for (const alert of alerts) {
    await queueEmail(alert.email, "stock-alert", {
      title,
      url: `${appUrl}/books/${bookId}`,
    });
  }
  if (alerts.length > 0) {
    await StockAlert.updateMany(
      { _id: { $in: alerts.map((alert) => alert._id) } },
      { $set: { notifiedAt: new Date() } }
    );
  }
  return { notified: alerts.length };
}
