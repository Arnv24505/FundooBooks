import { z } from "zod";

export const SORT_OPTIONS = [
  "popular",
  "price_asc",
  "price_desc",
  "rating",
  "newest",
] as const;

export const bookQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    author: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    sort: z.enum(SORT_OPTIONS).default("popular"),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: "minPrice must not be greater than maxPrice", path: ["minPrice"] }
  );

export type BookQuery = z.infer<typeof bookQuerySchema>;
