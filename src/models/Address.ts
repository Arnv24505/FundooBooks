import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, enum: ["home", "work", "other"], default: "home" },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, required: true, trim: true, maxlength: 15 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
default    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true, maxlength: 10 },
    isDefault: { type: Boolean, : false },
  },
  { timestamps: true }
);

addressSchema.index({ userId: 1, isDefault: -1 });

export type AddressDoc = InferSchemaType<typeof addressSchema>;

export const Address: Model<AddressDoc> =
  (models.Address as Model<AddressDoc> | undefined) ??
  model<AddressDoc>("Address", addressSchema);
