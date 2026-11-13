import { connectDB } from "@/lib/db";
import {
  demoOriginalPriceFor,
  demoPriceFor,
  demoRatingFor,
  demoStockFor,
} from "@/lib/money";
import { Book } from "@/models/Book";
import mongoose from "mongoose";

/**
 * Refresh storefront-only fields (price, stock, rating) on already-imported
 * books. Gutendex is never contacted. Useful after changing pricing rules.
 */
async function main() {
  await connectDB();
  const books = await Book.find({}, { sourceId: 1, price: 1 }).lean();
  const operations = books
    .filter((book) => typeof book.sourceId === "number")
    .map((book) => {
      const id = book.sourceId as number;
      const price = demoPriceFor(id);
      return {
        updateOne: {
          filter: { _id: book._id },
          update: {
            $set: {
              price,
              originalPrice: demoOriginalPriceFor(price),
              stock: demoStockFor(id),
              rating: demoRatingFor(id),
            },
          },
        },
      };
    });

  if (operations.length > 0) {
    const result = await Book.bulkWrite(operations, { ordered: false });
    console.log(`Updated storefront fields on ${result.modifiedCount} books`);
  } else {
    console.log("No books found");
  }
}

main()
  .catch((error) => {
    console.error("refresh failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
