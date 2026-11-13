import type { OrderStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  placed: "orange",
  confirmed: "blue",
  shipped: "geekblue",
  delivered: "green",
  cancelled: "red",
};

export const ORDER_STATUS_OPTIONS = (
  Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
).map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] }));

export function formatOrderDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
