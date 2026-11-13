import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const stockAlertSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    notifiedAt: Date,
  },
  { timestamps: true }
);

stockAlertSchema.index({ bookId: 1, email: 1 }, { unique: true });

export type StockAlertDoc = InferSchemaType<typeof stockAlertSchema>;

export const StockAlert: Model<StockAlertDoc> =
  (models.StockAlert as Model<StockAlertDoc> | undefined) ??
  model<StockAlertDoc>("StockAlert", stockAlertSchema);
