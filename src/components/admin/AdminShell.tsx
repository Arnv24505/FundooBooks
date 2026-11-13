"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  HomeOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { App, Avatar, Button } from "antd";
import Logo from "@/components/layout/Logo";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/actions";

const NAV = [
  { href: "/admin", label: "Overview", icon: <DashboardOutlined /> },
  { href: "/admin/books", label: "Books", icon: <BookOutlined /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingOutlined /> },
  { href: "/admin/users", label: "Customers", icon: <TeamOutlined /> },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const { message } = App.useApp();

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      message.warning(getApiErrorMessage(error));
    } finally {
      dispatch(setUser(null));
      queryClient.clear();
      message.success("Signed out");
      router.replace("/login?next=/admin");
      router.refresh();
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <Logo />
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: 2, marginTop: 6 }}>
            ADMIN CONSOLE
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
          <Link href="/" className="admin-nav-link" style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            <HomeOutlined style={{ marginRight: 8 }} />
            View storefront
          </Link>
          <Button
            block
            ghost
            icon={<LogoutOutlined />}
            onClick={() => void logout()}
            style={{ color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="admin-main">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--text-soft)" }}>
              Bookstore
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: "-0.5px" }}>
              {NAV.find((item) =>
                item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
              )?.label ?? "Admin"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar icon={<AppstoreOutlined />} style={{ background: "#ffe7e9", color: "var(--brand)" }}>
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name ?? "Admin"}</div>
              <div style={{ color: "var(--text-soft)", fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

