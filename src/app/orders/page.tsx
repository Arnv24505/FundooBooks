import type { Metadata } from "next";
import OrdersClient from "@/components/orders/OrdersClient";

export const metadata: Metadata = {
  title: "My orders",
  description: "Track your Bookstore orders and cash-on-delivery status.",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
