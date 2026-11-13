"use client";

import { useEffect, useMemo, useState } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useAddToCart, useServerCart } from "@/hooks/queries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addGuestItem,
  clearGuestCart,
  hydrateGuestCart,
  removeGuestItem,
  updateGuestItem,
} from "@/store/actions";
import type { Book, CartData } from "@/types";

/**
 * One cart interface for both guests and signed-in customers.
 * On sign-in, AuthBootstrap merges the guest cart into MongoDB.
 */
export function useCart() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const guest = useGuestCart();
  const serverCart = useServerCart();
  const addMutation = useAddToCart();
  const { message } = App.useApp();
  const router = useRouter();

  const cart: CartData = user && serverCart.data ? serverCart.data : guest;

  async function add(book: Book, quantity = 1) {
    if (!book.price) {
      message.warning("This title is not available for purchase yet.");
      return;
    }
    if ((book.stock ?? 0) <= 0) {
      message.warning("This title is out of stock.");
      return;
    }

    try {
      if (user) {
        await addMutation.mutateAsync({ bookId: book._id, quantity });
      } else {
        dispatch(
          addGuestItem({
            bookId: book._id,
            title: book.title,
            author: book.authors?.[0]?.name ?? "Unknown author",
            coverImage: book.coverImage,
            price: book.price,
            originalPrice: book.originalPrice,
            stock: book.stock ?? 0,
            quantity,
          })
        );
      }
      message.success(`Added “${book.title}” to your bag.`);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  function update(bookId: string, quantity: number) {
    if (user) {
      void api
        .patch(`/cart/${bookId}`, { quantity })
        .then(({ data }) => {
          void serverCart.refetch();
          return data;
        })
        .catch((error) => message.error(getApiErrorMessage(error)));
    } else {
      dispatch(updateGuestItem({ bookId, quantity }));
    }
  }

  function remove(bookId: string) {
    if (user) {
      void api
        .delete(`/cart/${bookId}`)
        .then(() => serverCart.refetch())
        .catch((error) => message.error(getApiErrorMessage(error)));
    } else {
      dispatch(removeGuestItem(bookId));
    }
  }

  function clear() {
    if (user) {
      void api
        .delete("/cart")
        .then(() => serverCart.refetch())
        .catch((error) => message.error(getApiErrorMessage(error)));
    } else {
      dispatch(clearGuestCart());
    }
  }

  async function goToCheckout() {
    if (!user) {
      router.push("/login?next=/cart");
      return;
    }
    router.push("/cart?step=address");
  }

  return {
    cart,
    isGuest: !user,
    isLoading: Boolean(user) && serverCart.isLoading,
    itemCount: cart.summary.itemCount,
    add,
    update,
    remove,
    clear,
    goToCheckout,
  };
}

/** Restores the guest cart from localStorage once, after hydration. */
export function useHydrateGuestCart() {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector((state) => state.cart.hydrated);
  const [done, setDone] = useState(hydrated);

  useEffect(() => {
    if (done) return;
    void import("@/store").then(({ readStoredGuestCart }) => {
      dispatch(hydrateGuestCart(readStoredGuestCart()));
      setDone(true);
    });
  }, [dispatch, done]);

  return done;
}

/** Merges a guest cart into the server cart after login. */
export async function mergeGuestCartAfterLogin(
  guestItems: import("@/types").GuestCartItem[]
): Promise<void> {
  if (guestItems.length > 0) {
    await api.post("/cart/merge", {
      items: guestItems.map((item) => ({ bookId: item.bookId, quantity: item.quantity })),
    });
  }
}

export function useCartItemCount() {
  const user = useAppSelector((state) => state.auth.user);
  const guest = useGuestCart();
  const serverCart = useServerCart();
  const count = useMemo(() => {
    if (user && serverCart.data) return serverCart.data.summary.itemCount;
    return guest.summary.itemCount;
  }, [user, serverCart.data, guest.summary.itemCount]);
  return count;
}
