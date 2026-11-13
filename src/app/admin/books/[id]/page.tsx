import type { Metadata } from "next";
import AdminBookEditClient from "@/components/admin/AdminBookEditClient";

export const metadata: Metadata = {
  title: "Edit book",
  robots: { index: false, follow: false },
};

export default async function AdminBookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminBookEditClient bookId={id} />;
}