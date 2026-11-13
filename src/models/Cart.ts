import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: {
      type: [
        {
          _id: false,
          bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
          quantity: { type: Number, required: true, min: 1, max: 10, default: 1 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export type CartDoc = InferSchemaType<typeof cartSchema>;

export const Cart: Model<CartDoc> =
  (models.Cart as Model<CartDoc> | undefined) ?? model<CartDoc>("Cart", cartSchema);
