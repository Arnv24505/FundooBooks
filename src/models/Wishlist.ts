import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const wishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bookIds: { type: [Schema.Types.ObjectId], ref: "Book", default: [] },
  },
  { timestamps: true }
);

export type WishlistDoc = InferSchemaType<typeof wishlistSchema>;

export const Wishlist: Model<WishlistDoc> =
  (models.Wishlist as Model<WishlistDoc> | undefined) ??
  model<WishlistDoc>("Wishlist", wishlistSchema);
