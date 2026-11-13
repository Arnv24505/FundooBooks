"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, App, Button, Form, Input } from "antd";
import { GoogleOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import AuthShell from "@/components/auth/AuthShell";
import { api, getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { mergeGuestCartAfterLogin } from "@/hooks/useCart";
import { readStoredGuestCart } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearGuestCart, setUser } from "@/store/actions";
import type { ApiEnvelope, SafeUser } from "@/types";

type LoginValues = { email: string; password: string };

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured:
    "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.",
  google_failed: "Google sign-in could not be completed. Please try again or use Password.",
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<LoginValues>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);

  const next = safeNext(searchParams.get("next"));
  const oauthError = searchParams.get("error");
  const oauthMessage = oauthError ? OAUTH_ERRORS[oauthError] : null;

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, router, next]);

  async function onFinish(values: LoginValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      const { data } = await api.post<ApiEnvelope<SafeUser>>("/auth/login", values);
      dispatch(setUser(data.data));

      const guestItems = readStoredGuestCart();
      if (guestItems.length > 0) {
        try {
          await mergeGuestCartAfterLogin(guestItems);
          dispatch(clearGuestCart());
        } catch {
          // The guest cart stays in local storage and can be merged on the next sign-in.
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      message.success(`Welcome back, ${data.data.name.split(" ")[0]}!`);
      router.replace(next);
      router.refresh();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        form.setFields(
          Object.entries(fields).map(([name, msg]) => ({
            name: name as keyof LoginValues,
            errors: [msg],
          }))
        );
      }
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell activeTab="login">
      {oauthMessage ? (
        <Alert
          type="warning"
          showIcon
          title={oauthMessage}
          style={{ marginBottom: 18 }}
        />
      ) : null}
      {formError ? (
        <Alert type="error" showIcon title={formError} style={{ marginBottom: 18 }} />
      ) : null}

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="email"
          label="Email id"
          rules={[
            { required: true, message: "Enter your Email id" },
            { type: "email", message: "Enter a valid Email id" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Enter Password" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            autoComplete="current-password"
          />
        </Form.Item>

        <div className="auth-forgot">
          <Link href="/forgot-password">Forgot Password?</Link>
        </div>

        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
          Login
        </Button>
      </Form>

      <div className="auth-divider">OR</div>

      <div className="social-row">
        <Button
          className="social-btn google"
          href={`/api/auth/google?next=${encodeURIComponent(next)}`}
          icon={<GoogleOutlined style={{ color: "#4285f4" }} />}
        >
          Google
        </Button>
      </div>
    </AuthShell>
  );
}


