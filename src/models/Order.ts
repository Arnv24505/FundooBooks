import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const orderItemSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    coverImage: String,
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderAddressSchema = new Schema(
  {
    label: { type: String, enum: ["home", "work", "other"], default: "home" },
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    items: { type: [orderItemSchema], required: true },
    customer: {
      fullName: { type: String, required: true },
      mobile: { type: String, required: true },
    },
    shippingAddress: { type: orderAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    status: { type: String, enum: ORDER_STATUSES, default: "placed", index: true },
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, enum: ORDER_STATUSES, required: true },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc> | undefined) ?? model<OrderDoc>("Order", orderSchema);
