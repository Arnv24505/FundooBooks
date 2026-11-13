import { Suspense } from "react";
import type { Metadata } from "next";
import CartClient from "@/components/checkout/CartClient";

export const metadata: Metadata = {
  title: "My cart",
  description: "Review your bag, choose a delivery address and place a cash-on-delivery order.",
};

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartClient />
    </Suspense>
  );
}
