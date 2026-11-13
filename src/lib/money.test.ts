import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  computeSummary,
  demoOriginalPriceFor,
  demoPriceFor,
  demoRatingFor,
  demoStockFor,
  formatINR,
} from "@/lib/money";

describe("formatINR", () => {
  it("formats whole rupees in the Indian grouping system", () => {
    expect(formatINR(1500)).toBe("₹1,500");
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(0)).toBe("₹0");
  });

  it("returns a dash for missing or invalid values", () => {
    expect(formatINR(undefined)).toBe("—");
    expect(formatINR(null)).toBe("—");
    expect(formatINR(Number.NaN)).toBe("—");
  });
});

describe("computeSummary", () => {
  it("returns zero totals for an empty cart", () => {
    expect(computeSummary([])).toEqual({
      itemCount: 0,
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    });
  });

  it("charges shipping below the free-shipping threshold", () => {
    const summary = computeSummary([{ price: 200, quantity: 2 }]);
    expect(summary.subtotal).toBe(400);
    expect(summary.shippingFee).toBe(STANDARD_SHIPPING_FEE);
    expect(summary.total).toBe(449);
  });

  it("gives free shipping at and above the threshold", () => {
    expect(computeSummary([{ price: 499, quantity: 1 }]).shippingFee).toBe(0);
    expect(computeSummary([{ price: 300, quantity: 2 }]).shippingFee).toBe(0);
  });

  it("counts quantities, not lines", () => {
    expect(computeSummary([{ price: 100, quantity: 3 }]).itemCount).toBe(3);
  });
});

describe("deterministic demo storefront fields", () => {
  it("derives a stable price per Gutenberg id", () => {
    expect(demoPriceFor(1)).toBe(249);
    expect(demoPriceFor(1342)).toBe(demoPriceFor(1342));
    for (const id of [1, 2, 3, 10, 99, 1000]) {
      const price = demoPriceFor(id);
      expect(price).toBeGreaterThanOrEqual(149);
      expect(price).toBeLessThanOrEqual(949);
      expect(price % 100).toBe(49);
    }
  });

  it("marks every nineteenth id as out of stock", () => {
    expect(demoStockFor(19)).toBe(0);
    expect(demoStockFor(1)).toBe(6);
    expect(demoStockFor(20)).toBe(25);
    expect(demoStockFor(20)).toBe(5 + (20 % 21));
  });

  it("keeps ratings inside the 1-5 star range", () => {
    for (let id = 1; id <= 100; id++) {
      const rating = demoRatingFor(id);
      expect(rating).toBeGreaterThanOrEqual(3.6);
      expect(rating).toBeLessThanOrEqual(4.9);
    }
  });

  it("rounds the list price up above the selling price", () => {
    expect(demoOriginalPriceFor(149)).toBe(200);
    expect(demoOriginalPriceFor(500)).toBe(650);
  });
});
