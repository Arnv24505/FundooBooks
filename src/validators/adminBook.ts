import { z } from "zod";

export const adminBookCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  authors: z
    .array(z.object({ name: z.string().trim().min(1).max(120) }))
    .min(1, "Add at least one author"),
  subjects: z.array(z.string().trim().min(1).max(100)).default([]),
  languages: z.array(z.string().trim().min(1).max(20)).default(["en"]),
  coverImage: z.string().url().optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  publisher: z.string().trim().max(120).optional().or(z.literal("")),
  isbn: z.string().trim().max(20).optional().or(z.literal("")),
  price: z.coerce.number().int().min(0).max(1_000_000),
  originalPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(100_000).default(0),
  binding: z.string().trim().max(40).optional().or(z.literal("")),
});

export const adminBookUpdateSchema = adminBookCreateSchema.partial().extend({
  rating: z.coerce.number().min(0).max(5).optional(),
});

export type AdminBookInput = z.infer<typeof adminBookCreateSchema>;
