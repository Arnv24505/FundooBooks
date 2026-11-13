"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type {
  AdminEnvelope,
  AdminOrder,
  AdminStats,
  AdminUser,
  Book,
  OrderStatus,
} from "@/types";

export type AdminBookListParams = {
  page: number;
  limit: number;
  search?: string;
  lowStock?: boolean;
};

export type AdminOrderListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: OrderStatus;
};

export type AdminUserListParams = {
  page: number;
  limit: number;
  search?: string;
};

export type AdminBookPayload = {
  title: string;
  authors: Array<{ name: string }>;
  subjects?: string[];
  languages?: string[];
  coverImage?: string;
  description?: string;
  publisher?: string;
  isbn?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  binding?: string;
};

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<AdminStats>>("/admin/stats");
      return data.data;
    },
  });
}

export function useAdminBooks(params: AdminBookListParams) {
  return useQuery({
    queryKey: ["admin", "books", params],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<Book[]>>("/admin/books", {
        params: { ...params, lowStock: params.lowStock ? "true" : undefined },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminBook(id: string | null) {
  return useQuery({
    queryKey: ["admin", "book", id],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<Book>>(`/admin/books/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateAdminBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdminBookPayload) => {
      const { data } = await api.post<AdminEnvelope<Book>>("/admin/books", payload);
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      void queryClient.invalidateQueries({ queryKey: ["book-facets"] });
    },
  });
}

export function useUpdateAdminBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AdminBookPayload> }) => {
      const { data } = await api.patch<AdminEnvelope<Book>>(`/admin/books/${id}`, payload);
      return data.data;
    },
    onSuccess: (book) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "book", book._id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      void queryClient.invalidateQueries({ queryKey: ["book", book._id] });
      void queryClient.invalidateQueries({ queryKey: ["book-facets"] });
    },
  });
}

export function useDeleteAdminBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/books/${id}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      void queryClient.invalidateQueries({ queryKey: ["book-facets"] });
    },
  });
}

export function useAdminOrders(params: AdminOrderListParams) {
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<AdminOrder[]>>("/admin/orders", {
        params: { ...params, status: params.status || undefined },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string | null) {
  return useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<AdminOrder>>(`/admin/orders/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data } = await api.patch<AdminEnvelope<AdminOrder>>(`/admin/orders/${id}`, {
        status,
      });
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const { data } = await api.get<AdminEnvelope<AdminUser[]>>("/admin/users", {
        params,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AdminUser["role"] }) => {
      const { data } = await api.patch<AdminEnvelope<AdminUser>>(`/admin/users/${id}`, {
        role,
      });
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
