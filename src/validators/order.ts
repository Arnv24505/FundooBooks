import { z } from "zod";
import { mobileSchema, objectIdSchema } from "@/validators/auth";
import { addressSchema } from "@/validators/address";

export const createOrderSchema = z
  .object({
    addressId: objectIdSchema.optional(),
    address: addressSchema.optional(),
    customer: z
      .object({
        fullName: z.string().trim().min(2).max(80),
        mobile: mobileSchema,
      })
      .optional(),
    paymentMethod: z.literal("cod").default("cod"),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => Boolean(data.addressId || data.address), {
    message: "Choose a delivery address",
    path: ["addressId"],
  });

export const updateOrderStatusSchema = z.object({
  status: z.enum(["placed", "confirmed", "shipped", "delivered", "cancelled"]),
});
