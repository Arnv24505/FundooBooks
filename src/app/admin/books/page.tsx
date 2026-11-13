import { Suspense } from "react";
import type { Metadata } from "next";
import AdminBooksClient from "@/components/admin/AdminBooksClient";

export const metadata: Metadata = {
  title: "Books",
};

export default function AdminBooksPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-section" style={{ color: "#878787" }}>
          Loading catalogue…
        </div>
      }
    >
      <AdminBooksClient />
    </Suspense>
  );
}
