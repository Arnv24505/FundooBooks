import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: Date,
  },
  { timestamps: true }
);

export type PasswordResetTokenDoc = InferSchemaType<typeof passwordResetTokenSchema>;

export const PasswordResetToken: Model<PasswordResetTokenDoc> =
  (models.PasswordResetToken as Model<PasswordResetTokenDoc> | undefined) ??
  model<PasswordResetTokenDoc>("PasswordResetToken", passwordResetTokenSchema);
