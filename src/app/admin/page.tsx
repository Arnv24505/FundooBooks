import type { Metadata } from "next";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Overview",
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
