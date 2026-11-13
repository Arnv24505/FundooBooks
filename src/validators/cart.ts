import { z } from "zod";
import { objectIdSchema } from "@/validators/auth";

export const addToCartSchema = z.object({
  bookId: objectIdSchema,
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(10),
});

export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        bookId: objectIdSchema,
        quantity: z.coerce.number().int().min(1).max(10).default(1),
      })
    )
    .max(50)
    .default([]),
});
