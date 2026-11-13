import { Suspense } from "react";
import type { Metadata } from "next";
import AdminOrdersClient from "@/components/admin/AdminOrdersClient";

export const metadata: Metadata = {
  title: "Orders",
};

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-section" style={{ color: "#878787" }}>
          Loading orders…
        </div>
      }
    >
      <AdminOrdersClient />
    </Suspense>
  );
}
