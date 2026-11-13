import { z } from "zod";
import { emailSchema } from "@/validators/auth";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const stockAlertSchema = z.object({
  bookId: z.string().regex(/^[a-f\d]{24}$/i),
  email: emailSchema,
});
