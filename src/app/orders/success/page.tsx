import { Suspense } from "react";
import type { Metadata } from "next";
import OrderSuccessClient from "@/components/orders/OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your Bookstore order is confirmed.",
};

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessClient />
    </Suspense>
  );
}
