"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authReducer, cartReducer } from "@/store/slices";
import type { GuestCartItem } from "@/types";

const GUEST_CART_KEY = "bookstore_guest_cart";

/**
 * Creates a fresh store for each browser session (and each server render).
 * Client state kept here is intentionally limited to auth identity and the
 * guest cart; server data lives in TanStack Query.
 */
export function makeStore() {
  const store = configureStore({
    reducer: { auth: authReducer, cart: cartReducer },
    devTools: process.env.NODE_ENV !== "production",
  });

  if (typeof window !== "undefined") {
    store.subscribe(() => {
      const { guestItems } = store.getState().cart;
      try {
        window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
      } catch {
        // Storage can be unavailable in private mode; the in-memory cart still works.
      }
    });
  }

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export function readStoredGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GuestCartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { bookId?: unknown }).bookId === "string" &&
        typeof (item as { quantity?: unknown }).quantity === "number"
    );
  } catch {
    return [];
  }
}
