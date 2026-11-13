import { z } from "zod";
import { mobileSchema } from "@/validators/auth";

export const addressSchema = z.object({
  label: z.enum(["home", "work", "other"]).default("home"),
  fullName: z.string().trim().min(2).max(80),
  mobile: mobileSchema,
  line1: z.string().trim().min(5, "Enter the address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = addressSchema.partial();
