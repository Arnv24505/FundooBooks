import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, select: false },
    mobile: { type: String, trim: true, maxlength: 20 },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: String,
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ?? model<UserDoc>("User", userSchema);

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: "user" | "admin";
  provider: "local" | "google";
  avatarUrl?: string;
};

export function toSafeUser(user: {
  _id: unknown;
  name: string;
  email: string;
  mobile?: string | null;
  role: "user" | "admin";
  provider: "local" | "google";
  avatarUrl?: string | null;
}): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    mobile: user.mobile ?? undefined,
    role: user.role,
    provider: user.provider,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}
