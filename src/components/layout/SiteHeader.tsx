"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  HeartOutlined,
  LoginOutlined,
  LogoutOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { App, Button, Drawer, Input } from "antd";
import Logo from "@/components/layout/Logo";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { useCartItemCount } from "@/hooks/useCart";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/actions";

function MenuIcon() {
  return (
    <svg
      className="header-menu-icon"
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const itemCount = useCartItemCount();
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // The header mirrors the browser URL, which is an external system.
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSearch(params.get("search") ?? "");
      setActiveCategory(pathname === "/" ? params.get("category") ?? "" : "");
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".ant-popover, .ant-popconfirm")) return;
      if (!menuRef.current?.contains(target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function submitSearch(value: string) {
    const query = value.trim();
    router.push(query ? `/?search=${encodeURIComponent(query)}` : "/");
    setActiveCategory("");
    setDrawerOpen(false);
    setMenuOpen(false);
  }

  function selectCategory(category: string | null) {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    params.delete("search");
    if (category) params.set("category", category);
    else params.delete("category");
    setActiveCategory(category ?? "");
    router.push(params.toString() ? `/?${params.toString()}` : "/");
    setDrawerOpen(false);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      message.warning(getApiErrorMessage(error));
    } finally {
      dispatch(setUser(null));
      queryClient.clear();
      setMenuOpen(false);
      setDrawerOpen(false);
      message.success("Signed out");
      router.replace("/");
      router.refresh();
    }
  }

  function go(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

  return (
    <header className="site-header">
      <div className="container-page site-header-inner">
        <Logo />

          <div className="header-search">
            <Input
              allowClear
              prefix={<SearchOutlined className="header-search-icon" />}
              placeholder="Search ..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => submitSearch(search)}
              aria-label="Search books"
            />
          </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-action header-menu-toggle mobile-only"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <MenuIcon />
            <span>Menu</span>
          </button>

          <Link href="/wishlist" className="header-action header-wishlist desktop-only" aria-label="Wishlist">
            <HeartOutlined />
            <span>Wishlist</span>
          </Link>

          <Link href="/cart" className="header-action header-cart" aria-label={`Cart, ${itemCount} items`}>
            <span className="header-cart-mark">
              <ShoppingCartOutlined />
              {itemCount > 0 ? <span className="header-cart-count">{itemCount}</span> : null}
            </span>
            <span>Cart</span>
          </Link>

          {!user ? (
            <div className="header-auth-links desktop-only">
              <Link href="/login" className="header-login-link">Login</Link>
              <Link href="/signup" className="header-signup-link">Sign up</Link>
            </div>
          ) : (
            <div className="profile-menu-wrap desktop-only" ref={menuRef}>
              <button
                type="button"
                className="header-action"
                aria-label={ready ? `${firstName} account menu` : "Profile account menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <UserOutlined />
                <span>{ready ? firstName : "Profile"}</span>
              </button>
              {menuOpen ? (
                <div className="profile-menu" role="menu">
                  <span className="profile-menu-hello">Hello {firstName},</span>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-menu-link"
                    onClick={() => go("/profile")}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-menu-link"
                    onClick={() => go("/orders")}
                  >
                    My Orders
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-menu-link"
                    onClick={() => go("/wishlist")}
                  >
                    Wishlist
                  </button>
                  {user.role === "admin" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-link"
                      onClick={() => go("/admin")}
                    >
                      Admin dashboard
                    </button>
                  ) : null}
                  <div className="profile-menu-divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-menu-link"
                    onClick={() => void logout()}
                  >
                    <LogoutOutlined style={{ marginRight: 8 }} />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <nav className="category-nav" aria-label="Book categories">
        <div className="container-page category-nav-inner">
          {["All books", "Fiction", "Design", "Technology", "Self-help", "Children", "Biography"].map(
            (category) => {
              const value = category === "All books" ? null : category;
              const active = value ? activeCategory === value : !activeCategory && pathname === "/";
              return (
                <button
                  type="button"
                  key={category}
                  className={`category-nav-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => selectCategory(value)}
                >
                  {category}
                </button>
              );
            }
          )}
        </div>
      </nav>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        size={300}
        title={<Logo />}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <Input.Search
            placeholder="Search ..."
            allowClear
            onSearch={submitSearch}
            enterButton
          />
          <Button block href="/wishlist" icon={<HeartOutlined />}>
            Wishlist
          </Button>
          <Button block href="/cart" icon={<ShoppingCartOutlined />}>
            Cart ({itemCount})
          </Button>
          {user ? (
            <>
              <Button block href="/profile" icon={<UserOutlined />}>
                Profile
              </Button>
              <Button block href="/orders">
                My Orders
              </Button>
              {user.role === "admin" && <Button block href="/admin">Admin dashboard</Button>}
              <Button danger block icon={<LogoutOutlined />} onClick={() => void logout()}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button type="primary" block href="/login" icon={<LoginOutlined />}>
                Login / Signup
              </Button>
              <Button block href="/orders">
                My Orders
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </header>
  );
}

