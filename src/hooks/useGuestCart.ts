"use client";

import { computeSummary } from "@/lib/money";
import { useAppSelector } from "@/store/hooks";
import type { CartData } from "@/types";

/**
 * Guest carts live in Redux/localStorage. Signed-in carts live in MongoDB and
 * are fetched through TanStack Query (see useServerCart in hooks/queries).
 */
export function useGuestCart(): CartData {
  const items = useAppSelector((state) => state.cart.guestItems);
  const cartItems = items.map((item) => ({
    ...item,
    lineTotal: item.price * item.quantity,
  }));
  return { items: cartItems, summary: computeSummary(cartItems) };
}
