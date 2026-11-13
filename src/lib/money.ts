/**
 * All storefront money is stored and handled as whole Indian Rupees.
 * Prices are displayed with the rupee symbol and Indian digit grouping,
 * e.g. "₹1,50,000", everywhere in the UI.
 */
export const inrNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Formats a rupee amount, e.g. 1500 -> "₹1,500". */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "—";
  return `₹${inrNumberFormatter.format(Number(amount))}`;
}

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_FEE = 49;

export type PricedItem = { price: number; quantity: number };

export function computeSummary(items: PricedItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingFee =
    items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  return {
    itemCount,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
}

/**
 * Gutendex does not publish prices or stock. The storefront derives stable,
 * clearly-labelled demo pricing from the Gutenberg id so the catalogue is
 * shoppable without pretending Gutendex supplied a price.
 */
export function demoPriceFor(sourceId: number): number {
  const bucket = Math.abs(sourceId) % 9;
  return 149 + bucket * 100;
}

export function demoOriginalPriceFor(price: number): number {
  // Round up to a tidy number above the selling price.
  return Math.ceil((price * 1.25) / 50) * 50;
}

export function demoStockFor(sourceId: number): number {
  return Math.abs(sourceId) % 19 === 0 ? 0 : 5 + (Math.abs(sourceId) % 21);
}

export function demoRatingFor(sourceId: number): number {
  return Math.round((3.6 + (Math.abs(sourceId) % 14) / 10) * 10) / 10;
}
