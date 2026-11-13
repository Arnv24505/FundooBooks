import type { Metadata } from "next";
import BookDetailClient from "@/components/books/BookDetailClient";

export const metadata: Metadata = {
  title: "Book details",
  description:
    "Read the description, check availability and customer feedback, then order with cash on delivery.",
};

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookDetailClient id={id} />;
}
