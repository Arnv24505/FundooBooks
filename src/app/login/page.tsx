import { Suspense } from "react";
import type { Metadata } from "next";
import LoginClient from "@/components/auth/LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Bookstore account to manage your wishlist and orders.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
