import type { Metadata } from "next";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export const metadata: Metadata = {
  title: "Customers",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
