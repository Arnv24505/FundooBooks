"use client";

import { useEffect, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { api } from "@/lib/apiClient";
import { makeStore, readStoredGuestCart } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { clearGuestCart, hydrateGuestCart, setReady, setUser } from "@/store/actions";
import type { ApiEnvelope, SafeUser } from "@/types";
import { mergeGuestCartAfterLogin } from "@/hooks/useCart";

function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateGuestCart(readStoredGuestCart()));

    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<ApiEnvelope<SafeUser | null>>("/auth/me");
        if (cancelled) return;
        dispatch(setUser(data.data));
        if (data.data) {
          const guestItems = readStoredGuestCart();
          if (guestItems.length > 0) {
            await mergeGuestCartAfterLogin(guestItems);
            dispatch(clearGuestCart());
          }
        }
      } catch {
        if (!cancelled) dispatch(setUser(null));
      } finally {
        if (!cancelled) dispatch(setReady(true));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setDark(colorScheme.matches);

    updateTheme();
    colorScheme.addEventListener("change", updateTheme);
    return () => colorScheme.removeEventListener("change", updateTheme);
  }, []);

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: dark ? "#d46b72" : "#a03037",
            colorLink: dark ? "#d46b72" : "#a03037",
            colorSuccess: dark ? "#5fbf76" : "#388e3c",
            colorText: dark ? "#e8e3e3" : "#333232",
            colorTextSecondary: dark ? "#b8adad" : "#878787",
            colorBgBase: dark ? "#161314" : "#ffffff",
            colorBgContainer: dark ? "#211d1e" : "#ffffff",
            colorBgElevated: dark ? "#2a2526" : "#ffffff",
            colorBorder: dark ? "#3a3334" : "#e2e2e2",
            colorBorderSecondary: dark ? "#312b2c" : "#f0f0f0",
            borderRadius: 8,
            fontFamily:
              'Roboto, Lato, "Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif',
            controlHeight: 42,
          },
          components: {
            Button: { fontWeight: 600, primaryShadow: "none" },
            Input: {
              activeBorderColor: dark ? "#d46b72" : "#a03037",
              hoverBorderColor: dark ? "#bf5c63" : "#8f2b2f",
            },
            Menu: {
              itemSelectedColor: dark ? "#f0c9cc" : "#a03037",
              itemSelectedBg: dark ? "#3a2326" : "#ffe7e9",
            },
            Table: { headerBg: dark ? "#241f20" : "#f5f5f5" },
            Tabs: {
              inkBarColor: dark ? "#d46b72" : "#a03037",
              itemSelectedColor: dark ? "#d46b72" : "#a03037",
            },
          },
        }}
      >
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <App>
              <AuthBootstrap />
              {children}
            </App>
          </QueryClientProvider>
        </Provider>
      </ConfigProvider>
    </AntdRegistry>
  );
}
