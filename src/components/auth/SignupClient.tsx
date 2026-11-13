"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Form, Input } from "antd";
import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import AuthShell from "@/components/auth/AuthShell";
import { api, getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { mergeGuestCartAfterLogin } from "@/hooks/useCart";
import { readStoredGuestCart } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearGuestCart, setUser } from "@/store/actions";
import type { ApiEnvelope, SafeUser } from "@/types";

type SignupValues = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
};

export default function SignupClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<SignupValues>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  async function onFinish(values: SignupValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      const { data } = await api.post<ApiEnvelope<SafeUser>>("/auth/register", {
        ...values,
        mobile: values.mobile ?? "",
      });
      dispatch(setUser(data.data));

      const guestItems = readStoredGuestCart();
      if (guestItems.length > 0) {
        try {
          await mergeGuestCartAfterLogin(guestItems);
          dispatch(clearGuestCart());
        } catch {
          // Keep the local cart for a later merge.
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      message.success("Your account is ready. Happy reading!");
      router.replace("/");
      router.refresh();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        form.setFields(
          Object.entries(fields).map(([name, msg]) => ({
            name: name as keyof SignupValues,
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
    <AuthShell activeTab="signup">
      {formError ? (
        <Alert type="error" showIcon title={formError} style={{ marginBottom: 18 }} />
      ) : null}

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="name"
          label="Full Name"
          rules={[
            { required: true, message: "Enter your Full Name" },
            { min: 2, message: "Name must be at least 2 characters" },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Enter Full Name" autoComplete="name" />
        </Form.Item>
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
          rules={[
            { required: true, message: "Choose a password" },
            { min: 8, message: "Use at least 8 characters" },
            { pattern: /[A-Za-z]/, message: "Include at least one letter" },
            { pattern: /\d/, message: "Include at least one number" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="At least 8 characters, with a number"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          name="mobile"
          label="Mobile number"
          rules={[
            { pattern: /^\d{10,15}$/, message: "Enter a valid Mobile number" },
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder="10-digit Mobile number"
            autoComplete="tel"
            inputMode="numeric"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
          className="auth-submit"
        >
          Signup
        </Button>
      </Form>
    </AuthShell>
  );
}


