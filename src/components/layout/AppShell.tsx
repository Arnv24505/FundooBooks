"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

const BARE_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isAdmin = pathname.startsWith("/admin");

  if (bare || isAdmin) return <>{children}</>;

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="app-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
