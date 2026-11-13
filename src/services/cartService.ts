import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { computeSummary } from "@/lib/money";
import { Book } from "@/models/Book";
import { Cart } from "@/models/Cart";

export type CartItemView = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  quantity: number;
  lineTotal: number;
};

type LeanBook = {
  _id: unknown;
  title: string;
  authors?: Array<{ name?: string }>;
  coverImage?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  stock?: number | null;
};

const MAX_QUANTITY = 10;

export async function getCart(userId: string) {
  await connectDB();
  const cart = await Cart.findOne({ userId }).lean();
  const rawItems = cart?.items ?? [];
  const books = await Book.find({ _id: { $in: rawItems.map((item) => item.bookId) } })
    .select("title authors coverImage price originalPrice stock")
    .lean();
  const bookMap = new Map(
    (books as unknown as LeanBook[]).map((book) => [String(book._id), book])
  );

  const items: CartItemView[] = rawItems.flatMap((item) => {
    const book = bookMap.get(String(item.bookId));
    if (!book || !book.price) return [];
    const stock = book.stock ?? 0;
    return [
      {
        bookId: String(book._id),
        title: book.title,
        author: book.authors?.[0]?.name ?? "Unknown author",
        coverImage: book.coverImage ?? undefined,
        price: book.price,
        originalPrice: book.originalPrice ?? undefined,
        stock,
        quantity: item.quantity,
        lineTotal: book.price * item.quantity,
      },
    ];
  });

  return { items, summary: computeSummary(items) };
}

export async function addToCart(userId: string, bookId: string, quantity: number) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const book = await Book.findById(bookId).select("price stock title").lean();
  if (!book) throw new ApiError(404, "Book not found");
  if (!book.price) throw new ApiError(409, "This title is not available for purchase yet");
  if ((book.stock ?? 0) <= 0) throw new ApiError(409, "This title is out of stock");

  const cart = (await Cart.findOne({ userId })) ?? new Cart({ userId, items: [] });
  const existing = cart.items.find((item) => String(item.bookId) === bookId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (nextQuantity > (book.stock ?? 0)) {
    throw new ApiError(409, `Only ${book.stock} copies are available`);
  }
  if (nextQuantity > MAX_QUANTITY) {
    throw new ApiError(400, `You can order up to ${MAX_QUANTITY} copies of a title`);
  }

  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ bookId, quantity } as never);

  await cart.save();
  return getCart(userId);
}

export async function updateCartItem(userId: string, bookId: string, quantity: number) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new ApiError(404, "Your cart is empty");

  const item = cart.items.find((entry) => String(entry.bookId) === bookId);
  if (!item) throw new ApiError(404, "This title is not in your cart");

  const book = await Book.findById(bookId).select("stock").lean();
  if (!book) throw new ApiError(404, "Book not found");
  if (quantity > (book.stock ?? 0)) {
    throw new ApiError(409, `Only ${book.stock} copies are available`);
  }

  item.quantity = quantity;
  await cart.save();
  return getCart(userId);
}

export async function removeCartItem(userId: string, bookId: string) {
  if (!isValidObjectId(bookId)) throw new ApiError(400, "Invalid book id");
  await connectDB();
  await Cart.updateOne({ userId }, { $pull: { items: { bookId } } });
  return getCart(userId);
}

export async function mergeCart(
  userId: string,
  items: Array<{ bookId: string; quantity: number }>
) {
  await connectDB();
  if (items.length === 0) return getCart(userId);

  const validIds = items.map((item) => item.bookId).filter(isValidObjectId);
  const books = await Book.find({ _id: { $in: validIds } })
    .select("price stock")
    .lean();
  const stockMap = new Map(
    (books as unknown as LeanBook[]).map((book) => [String(book._id), book])
  );

  const cart = (await Cart.findOne({ userId })) ?? new Cart({ userId, items: [] });

  for (const incoming of items) {
    const book = stockMap.get(incoming.bookId);
    if (!book || !book.price || (book.stock ?? 0) <= 0) continue;

    const existing = cart.items.find((item) => String(item.bookId) === incoming.bookId);
    const merged = Math.min(
      (existing?.quantity ?? 0) + incoming.quantity,
      book.stock ?? 0,
      MAX_QUANTITY
    );
    if (existing) existing.quantity = merged;
    else cart.items.push({ bookId: incoming.bookId, quantity: merged } as never);
  }

  await cart.save();
  return getCart(userId);
}

export async function clearCart(userId: string) {
  await connectDB();
  await Cart.updateOne({ userId }, { $set: { items: [] } });
}
