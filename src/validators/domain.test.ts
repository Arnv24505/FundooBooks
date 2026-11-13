import { describe, expect, it } from "vitest";
import { addressSchema } from "@/validators/address";
import { bookQuerySchema } from "@/validators/bookQuery";
import { addToCartSchema, mergeCartSchema, updateCartItemSchema } from "@/validators/cart";
import { createOrderSchema, updateOrderStatusSchema } from "@/validators/order";
import { reviewSchema, stockAlertSchema } from "@/validators/review";

const objectId = "64b7f9c2e1a2b3c4d5e6f708";

const validAddress = {
  label: "home",
  fullName: "Ada Lovelace",
  mobile: "9876543210",
  line1: "12 Analytical Engine Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560034",
};

describe("addressSchema", () => {
  it("accepts a complete Indian address", () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rejects a pincode that is not six digits", () => {
    expect(addressSchema.safeParse({ ...validAddress, pincode: "5600" }).success).toBe(false);
  });

  it("defaults the label and default flag", () => {
    const parsed = addressSchema.parse({ ...validAddress, label: undefined });
    expect(parsed.label).toBe("home");
    expect(parsed.isDefault).toBe(false);
  });
});

describe("bookQuerySchema", () => {
  it("applies paging and sort defaults", () => {
    const parsed = bookQuerySchema.parse({});
    expect(parsed).toMatchObject({ page: 1, limit: 12, sort: "popular" });
  });

  it("coerces query-string numbers", () => {
    const parsed = bookQuerySchema.parse({ page: "3", limit: "24", minPrice: "200" });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(24);
    expect(parsed.minPrice).toBe(200);
  });

  it("transforms inStock into a boolean", () => {
    expect(bookQuerySchema.parse({ inStock: "true" }).inStock).toBe(true);
    expect(bookQuerySchema.parse({ inStock: "false" }).inStock).toBe(false);
  });

  it("rejects a price range where min is above max", () => {
    expect(bookQuerySchema.safeParse({ minPrice: 900, maxPrice: 100 }).success).toBe(false);
  });

  it("caps the page size at 50", () => {
    expect(bookQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  });
});

describe("cart validators", () => {
  it("requires a valid ObjectId and a quantity of 1-10", () => {
    expect(addToCartSchema.safeParse({ bookId: objectId, quantity: 2 }).success).toBe(true);
    expect(addToCartSchema.safeParse({ bookId: "nope", quantity: 2 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ bookId: objectId, quantity: 11 }).success).toBe(false);
  });

  it("defaults quantity to one", () => {
    expect(addToCartSchema.parse({ bookId: objectId }).quantity).toBe(1);
    expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });

  it("caps merged guest carts at 50 lines", () => {
    const items = Array.from({ length: 51 }, () => ({ bookId: objectId, quantity: 1 }));
    expect(mergeCartSchema.safeParse({ items }).success).toBe(false);
  });
});

describe("order validators", () => {
  it("accepts a saved address or an inline address", () => {
    expect(createOrderSchema.safeParse({ addressId: objectId }).success).toBe(true);
    expect(
      createOrderSchema.safeParse({ address: validAddress, paymentMethod: "cod" }).success
    ).toBe(true);
  });

  it("rejects an order without any address", () => {
    expect(createOrderSchema.safeParse({ paymentMethod: "cod" }).success).toBe(false);
  });

  it("only allows cash on delivery", () => {
    expect(
      createOrderSchema.safeParse({ addressId: objectId, paymentMethod: "card" }).success
    ).toBe(false);
  });

  it("only accepts known statuses", () => {
    expect(updateOrderStatusSchema.safeParse({ status: "shipped" }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: "lost" }).success).toBe(false);
  });
});

describe("review and stock-alert validators", () => {
  it("accepts whole-star ratings from 1 to 5", () => {
    expect(reviewSchema.safeParse({ rating: 4 }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 4.5 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("requires a valid email for stock alerts", () => {
    expect(stockAlertSchema.safeParse({ bookId: objectId, email: "ada@example.com" }).success).toBe(
      true
    );
    expect(stockAlertSchema.safeParse({ bookId: objectId, email: "nope" }).success).toBe(false);
  });
});
