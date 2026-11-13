import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GuestCartItem } from "@/types";

type AuthState = {
  user: import("@/types").SafeUser | null;
  ready: boolean;
};

type CartState = {
  guestItems: GuestCartItem[];
  hydrated: boolean;
};

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, ready: false } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<AuthState["user"]>) {
      state.user = action.payload;
      state.ready = true;
    },
    setReady(state, action: PayloadAction<boolean>) {
      state.ready = action.payload;
    },
  },
});

const cartSlice = createSlice({
  name: "cart",
  initialState: { guestItems: [], hydrated: false } as CartState,
  reducers: {
    hydrateGuestCart(state, action: PayloadAction<GuestCartItem[]>) {
      state.guestItems = action.payload;
      state.hydrated = true;
    },
    addGuestItem(state, action: PayloadAction<GuestCartItem>) {
      const existing = state.guestItems.find((item) => item.bookId === action.payload.bookId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + action.payload.quantity, existing.stock, 10);
      } else {
        state.guestItems.push({
          ...action.payload,
          quantity: Math.min(action.payload.quantity, action.payload.stock, 10),
        });
      }
    },
    updateGuestItem(
      state,
      action: PayloadAction<{ bookId: string; quantity: number }>
    ) {
      const item = state.guestItems.find((entry) => entry.bookId === action.payload.bookId);
      if (item) item.quantity = Math.max(1, Math.min(action.payload.quantity, item.stock, 10));
    },
    removeGuestItem(state, action: PayloadAction<string>) {
      state.guestItems = state.guestItems.filter((item) => item.bookId !== action.payload);
    },
    clearGuestCart(state) {
      state.guestItems = [];
    },
  },
});

export const { setUser, setReady } = authSlice.actions;
export const {
  hydrateGuestCart,
  addGuestItem,
  updateGuestItem,
  removeGuestItem,
  clearGuestCart,
} = cartSlice.actions;

export const authReducer = authSlice.reducer;
export const cartReducer = cartSlice.reducer;
