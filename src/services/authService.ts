import { createHash, randomBytes } from "node:crypto";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { queueEmail } from "@/lib/mailer";
import { User, toSafeUser, type SafeUser } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "@/validators/auth";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(input: RegisterInput): Promise<{ user: SafeUser; tokenVersion: number }> {
  await connectDB();
  const email = normaliseEmail(input.email);
  const existing = await User.exists({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const isAdmin = env.adminEmails.includes(email);

  const user = await User.create({
    name: input.name,
    email,
    passwordHash,
    mobile: input.mobile || undefined,
    role: isAdmin ? "admin" : "user",
    provider: "local",
  });

  await queueEmail(user.email, "welcome", { name: user.name });

  return { user: toSafeUser(user), tokenVersion: user.tokenVersion ?? 0 };
}

export async function loginUser(
  input: LoginInput
): Promise<{ user: SafeUser; tokenVersion: number }> {
  await connectDB();
  const email = normaliseEmail(input.email);
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) throw new ApiError(401, "Invalid email or password");
  if (!user.passwordHash) {
    throw new ApiError(401, "This account uses Google sign-in. Continue with Google instead.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  user.lastLoginAt = new Date();
  await user.save();

  await queueEmail(user.email, "login-alert", { name: user.name });

  return { user: toSafeUser(user), tokenVersion: user.tokenVersion ?? 0 };
}

export async function createPasswordReset(emailInput: string): Promise<void> {
  await connectDB();
  const email = normaliseEmail(emailInput);
  const user = await User.findOne({ email });
  if (!user) return; // Do not reveal whether the address exists.

  const token = randomBytes(32).toString("hex");
  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await queueEmail(user.email, "password-reset", {
    name: user.name,
    url: `${env.appUrl}/reset-password?token=${token}`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await connectDB();
  const record = await PasswordResetToken.findOne({
    tokenHash: hashToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!record) throw new ApiError(400, "This reset link is invalid or has expired");

  const user = await User.findById(record.userId);
  if (!user) throw new ApiError(400, "This reset link is invalid or has expired");

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  record.usedAt = new Date();
  await record.save();
  await PasswordResetToken.deleteMany({ userId: user._id, _id: { $ne: record._id } });

  await queueEmail(user.email, "password-changed", { name: user.name });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<{ user: SafeUser; tokenVersion: number }> {
  await connectDB();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError(404, "Account not found");

  if (input.name !== undefined) user.name = input.name;
  if (input.mobile !== undefined) user.mobile = input.mobile || undefined;

  let passwordChanged = false;
  if (input.newPassword) {
    if (!input.currentPassword) throw new ApiError(400, "Current password is required");
    if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Current password is incorrect");
    }
    user.passwordHash = await hashPassword(input.newPassword);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    passwordChanged = true;
  }

  await user.save();

  if (passwordChanged) {
    await queueEmail(user.email, "password-changed", { name: user.name });
  }

  return { user: toSafeUser(user), tokenVersion: user.tokenVersion ?? 0 };
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

export async function loginWithGoogle(
  profile: GoogleProfile
): Promise<{ user: SafeUser; tokenVersion: number }> {
  await connectDB();
  if (!profile.email) throw new ApiError(400, "Google account has no email address");

  const email = normaliseEmail(profile.email);
  let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });

  if (!user) {
    user = await User.create({
      name: profile.name?.trim() || email.split("@")[0],
      email,
      googleId: profile.sub,
      provider: "google",
      avatarUrl: profile.picture,
      role: env.adminEmails.includes(email) ? "admin" : "user",
    });
    await queueEmail(user.email, "welcome", { name: user.name });
  } else {
    if (!user.googleId) user.googleId = profile.sub;
    if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
    user.lastLoginAt = new Date();
    await user.save();
    await queueEmail(user.email, "login-alert", { name: user.name });
  }

  return { user: toSafeUser(user), tokenVersion: user.tokenVersion ?? 0 };
}
