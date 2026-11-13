import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { computeSummary } from "@/lib/money";
import { queueEmail } from "@/lib/mailer";
import { Book } from "@/models/Book";
import { Order, ORDER_STATUSES } from "@/models/Order";
import { User } from "@/models/User";
import { getAddressForUser } from "@/services/addressService";
import { clearCart, getCart } from "@/services/cartService";
import type { z } from "zod";
import type { createOrderSchema } from "@/validators/order";

type CreateOrderInput = z.infer<typeof createOrderSchema>;

type BookStock = {
  _id: unknown;
  title: string;
  stock?: number | null;
  price?: number | null;
  originalPrice?: number | null;
};

function makeOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `BK-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

async function restoreStock(items: Array<{ bookId: unknown; quantity: number }>) {
  await Promise.all(
    items.map((item) =>
      Book.updateOne({ _id: item.bookId }, { $inc: { stock: item.quantity } })
    )
  );
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  await connectDB();
  const cart = await getCart(userId);
  if (cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

  const address = input.addressId
    ? await getAddressForUser(userId, input.addressId)
    : input.address;

  if (!address) throw new ApiError(400, "Choose a delivery address");

  const customer = input.customer ?? {
    fullName: address.fullName,
    mobile: address.mobile,
  };

  const bookIds = cart.items.map((item) => item.bookId);
  const books = (await Book.find({ _id: { $in: bookIds } })
    .select("title stock price originalPrice")
    .lean()) as unknown as BookStock[];
  const bookMap = new Map(books.map((book) => [String(book._id), book]));

  const decremented: Array<{ bookId: string; quantity: number }> = [];

  try {
    for (const item of cart.items) {
      const book = bookMap.get(item.bookId);
      if (!book || !book.price) throw new ApiError(409, `${item.title} is no longer available`);

      const updated = await Book.findOneAndUpdate(
        { _id: book._id, stock: { $gte: item.quantity }, price: { $gt: 0 } },
        { $inc: { stock: -item.quantity } },
        { returnDocument: "after" }
      );
      if (!updated) {
        throw new ApiError(409, `${item.title} does not have enough stock`);
      }
      decremented.push({ bookId: item.bookId, quantity: item.quantity });
    }

    const summary = computeSummary(
      cart.items.map((item) => ({ price: item.price, quantity: item.quantity }))
    );

    const order = await Order.create({
      userId,
      orderNumber: makeOrderNumber(),
      items: cart.items.map((item) => ({
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        coverImage: item.coverImage,
        price: item.price,
        originalPrice: bookMap.get(item.bookId)?.originalPrice ?? undefined,
        quantity: item.quantity,
      })),
      customer,
      shippingAddress: {
        label: address.label ?? "home",
        fullName: address.fullName,
        mobile: address.mobile,
        line1: address.line1,
        line2: address.line2 ?? undefined,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      subtotal: summary.subtotal,
      shippingFee: summary.shippingFee,
      total: summary.total,
      paymentMethod: "cod",
      status: "placed",
      statusHistory: [{ status: "placed", at: new Date() }],
    });

    await clearCart(userId);

    const user = await User.findById(userId).select("name email").lean();
    if (user) {
      await queueEmail(user.email, "order-confirmation", {
        name: user.name,
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    }

    return order.toObject();
  } catch (error) {
    if (decremented.length > 0) await restoreStock(decremented);
    throw error;
  }
}

export async function listOrders(userId: string) {
  await connectDB();
  return Order.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getOrder(userId: string, orderId: string, isAdmin = false) {
  if (!isValidObjectId(orderId)) throw new ApiError(400, "Invalid order id");
  await connectDB();
  const filter = isAdmin ? { _id: orderId } : { _id: orderId, userId };
  const order = await Order.findOne(filter).lean();
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

export async function listAllOrders(options: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options.status && ORDER_STATUSES.includes(options.status as never)) {
    filter.status = options.status;
  }
  if (options.search) {
    filter.orderNumber = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const [data, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean(),
    Order.countDocuments(filter),
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

export async function updateOrderStatus(
  orderId: string,
  status: (typeof ORDER_STATUSES)[number]
) {
  if (!isValidObjectId(orderId)) throw new ApiError(400, "Invalid order id");
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  if (order.status === status) return order.toObject();
  if (order.status === "cancelled" && status !== "cancelled") {
    throw new ApiError(409, "A cancelled order cannot be reopened");
  }

  if (status === "cancelled" && order.status !== "cancelled") {
    await restoreStock(order.items.map((item) => ({ bookId: item.bookId, quantity: item.quantity })));
  }

  order.status = status;
  order.statusHistory.push({ status, at: new Date() } as never);
  await order.save();
  return order.toObject();
}

export async function getAdminStats() {
  await connectDB();
  const [bookCount, userCount, orderCount, revenue, lowStock, pending, recentOrders] =
    await Promise.all([
      Book.countDocuments(),
      User.countDocuments({ role: "user" }),
      Order.countDocuments(),
      Order.aggregate<{ total: number }>([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Book.countDocuments({ stock: { $lte: 3 } }),
      Order.countDocuments({ status: { $in: ["placed", "confirmed"] } }),
      Order.find().sort({ createdAt: -1 }).limit(6).lean(),
    ]);

  return {
    books: bookCount,
    customers: userCount,
    orders: orderCount,
    revenue: revenue[0]?.total ?? 0,
    lowStock,
    pending,
    recentOrders,
  };
}

export async function updateUserRole(
  actorId: string,
  userId: string,
  role: "user" | "admin"
) {
  await connectDB();
  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid customer id");
  if (actorId === userId) {
    throw new ApiError(400, "You cannot change your own role.");
  }

  const target = await User.findById(userId).select("role").lean();
  if (!target) throw new ApiError(404, "Customer not found");

  if (target.role === "admin" && role === "user") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      throw new ApiError(409, "At least one admin must remain.");
    }
  }

  // Bumping tokenVersion signs the affected user out everywhere so the new
  // role takes effect immediately instead of when their current JWT expires.
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { role }, $inc: { tokenVersion: 1 } },
    { new: true }
  )
    .select("name email mobile role provider createdAt lastLoginAt")
    .lean();

  return updated;
}

export async function listUsers(options: { page: number; limit: number; search?: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options.search) {
    const pattern = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .select("name email mobile role provider createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    data,
    pagination: { page: options.page, limit: options.limit, total, totalPages: Math.ceil(total / options.limit) },
  };
}
