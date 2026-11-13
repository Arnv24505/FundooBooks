import type { Metadata } from "next";
import WishlistClient from "@/components/wishlist/WishlistClient";

export const metadata: Metadata = {
  title: "My wishlist",
  description: "Books you have saved for later.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
