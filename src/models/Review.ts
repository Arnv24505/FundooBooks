import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;

export const Review: Model<ReviewDoc> =
  (models.Review as Model<ReviewDoc> | undefined) ?? model<ReviewDoc>("Review", reviewSchema);
