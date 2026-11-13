import type { Metadata } from "next";
import SignupClient from "@/components/auth/SignupClient";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Bookstore account to save a wishlist, track orders and check out faster.",
};

export default function SignupPage() {
  return <SignupClient />;
}
