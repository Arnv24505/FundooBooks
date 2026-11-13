import type { Metadata } from "next";
import ForgotPasswordClient from "@/components/auth/ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Bookstore account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
