import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^\d{10,15}$/, "Enter a valid mobile number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  password: passwordSchema,
  mobile: mobileSchema.optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Invalid reset token"),
  password: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    mobile: mobileSchema.optional().or(z.literal("")),
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
