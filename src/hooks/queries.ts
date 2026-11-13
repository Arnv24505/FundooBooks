"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAppSelector } from "@/store/hooks";
import type {
  Address,
  ApiEnvelope,
  Book,
  BookFacets,
  CartData,
  Order,
  Review,
  ReviewSummary,
  SafeUser,
} from "@/types";

export type CatalogFilters = {
  search?: string;
  category?: string;
  author?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
};

export async function fetchBooksPage(filters: CatalogFilters, page: number, limit = 12) {
  const { data } = await api.get<ApiEnvelope<Book[]>>("/books", {
    params: { ...filters, page, limit },
  });
  return data;
}

export function useBooks(filters: CatalogFilters, page = 1, limit = 12) {
  return useQuery({
    queryKey: ["books", filters, page, limit],
    queryFn: () => fetchBooksPage(filters, page, limit),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const { data } = await api.get<
        ApiEnvelope<Book> & { reviews: { data: Review[]; summary: ReviewSummary } }
      >(`/books/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useRelatedBooks(id: string) {
  return useQuery({
    queryKey: ["book", id, "related"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Book[]>>(`/books/${id}/related`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useFacets() {
  return useQuery({
    queryKey: ["book-facets"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<BookFacets>>("/books/facets");
      return data.data;
    },
    staleTime: 10 * 60_000,
  });
}

export function useServerCart() {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<CartData>>("/cart");
      return data.data;
    },
    enabled: Boolean(user),
    staleTime: 15_000,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, quantity }: { bookId: string; quantity: number }) => {
      const { data } = await api.post<ApiEnvelope<CartData>>("/cart", { bookId, quantity });
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cart"], data);
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, quantity }: { bookId: string; quantity: number }) => {
      const { data } = await api.patch<ApiEnvelope<CartData>>(`/cart/${bookId}`, { quantity });
      return data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.delete<ApiEnvelope<CartData>>(`/cart/${bookId}`);
      return data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });
}

export function useWishlist() {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<{ items: Book[] }> & { ids: string[] }>(
        "/wishlist"
      );
      return { books: data.data.items, ids: data.ids };
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, add }: { bookId: string; add: boolean }) => {
      if (add) await api.post("/wishlist", { bookId });
      else await api.delete(`/wishlist/${bookId}`);
      return { bookId, add };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useAddresses() {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Address[]>>("/addresses");
      return data.data;
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useOrders() {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Order[]>>("/orders");
      return data.data;
    },
    enabled: Boolean(user),
    staleTime: 15_000,
  });
}

export function useOrder(id: string) {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Order>>(`/orders/${id}`);
      return data.data;
    },
    enabled: Boolean(id && user),
  });
}

export function useProfile() {
  const user = useAppSelector((state) => state.auth.user);
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<SafeUser | null>>("/auth/me");
      return data.data;
    },
    enabled: Boolean(user),
  });
}
