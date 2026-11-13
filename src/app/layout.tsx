import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Bookstore — 1,000 Project Gutenberg classics",
    template: "%s · Bookstore",
  },
  description:
    "Browse, wishlist and order 1,000 Project Gutenberg classics. Cash on delivery across India.",
  applicationName: "Bookstore",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
