import type { GuestCartItem, SafeUser } from "@/types";

/**
 * Plain action creators that mirror the Redux Toolkit slices.
 *
 * They live outside `slices.ts` so components can dispatch actions without
 * pulling Redux Toolkit into the server bundle (Redux seeds internal action
 * types with Math.random(), which Next.js rejects while prerendering).
 */

export type SetUserAction = { type: "auth/setUser"; payload: SafeUser | null };
export type SetReadyAction = { type: "auth/setReady"; payload: boolean };
export type HydrateGuestCartAction = {
  type: "cart/hydrateGuestCart";
  payload: GuestCartItem[];
};
export type AddGuestItemAction = { type: "cart/addGuestItem"; payload: GuestCartItem };
export type UpdateGuestItemAction = {
  type: "cart/updateGuestItem";
  payload: { bookId: string; quantity: number };
};
export type RemoveGuestItemAction = { type: "cart/removeGuestItem"; payload: string };
export type ClearGuestCartAction = { type: "cart/clearGuestCart" };

export const setUser = (payload: SafeUser | null): SetUserAction => ({
  type: "auth/setUser",
  payload,
});

export const setReady = (payload: boolean): SetReadyAction => ({
  type: "auth/setReady",
  payload,
});

export const hydrateGuestCart = (payload: GuestCartItem[]): HydrateGuestCartAction => ({
  type: "cart/hydrateGuestCart",
  payload,
});

export const addGuestItem = (payload: GuestCartItem): AddGuestItemAction => ({
  type: "cart/addGuestItem",
  payload,
});

export const updateGuestItem = (
  payload: UpdateGuestItemAction["payload"]
): UpdateGuestItemAction => ({
  type: "cart/updateGuestItem",
  payload,
});

export const removeGuestItem = (payload: string): RemoveGuestItemAction => ({
  type: "cart/removeGuestItem",
  payload,
});

export const clearGuestCart = (): ClearGuestCartAction => ({
  type: "cart/clearGuestCart",
});
