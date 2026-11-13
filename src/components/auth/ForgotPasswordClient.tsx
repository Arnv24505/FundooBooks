"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Form, Input } from "antd";
import { MailOutlined } from "@ant-design/icons";
import AuthShell from "@/components/auth/AuthShell";
import { api, getApiErrorMessage } from "@/lib/apiClient";

export default function ForgotPasswordClient() {
  const [form] = Form.useForm<{ email: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onFinish(values: { email: string }) {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/auth/forgot-password", values);
      setSentTo(values.email);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a link to reset your password."
    >
      {sentTo ? (
        <>
          <Alert
            type="success"
            showIcon
            title="Check your inbox"
            description={`If an account exists for ${sentTo}, a password reset link is on its way. The link expires in one hour.`}
          />
          <p style={{ marginTop: 20, color: "var(--text-soft)", fontSize: 13 }}>
            Can&apos;t find it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                form.resetFields();
              }}
              style={{
                border: 0,
                background: "none",
                padding: 0,
                color: "var(--brand)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              try another email
            </button>
            .
          </p>
          <Button block size="large" href="/login" style={{ marginTop: 16 }}>
            Back to login
          </Button>
        </>
      ) : (
        <>
          {formError ? (
            <Alert type="error" showIcon title={formError} style={{ marginBottom: 18 }} />
          ) : null}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              name="email"
              label="Email id"
              rules={[
                { required: true, message: "Enter your email address" },
                { type: "email", message: "Enter a valid email address" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Reset password
            </Button>
          </Form>
          <p style={{ marginTop: 22, textAlign: "center", color: "var(--text-soft)", fontSize: 13 }}>
            Don&apos;t have an account? <Link href="/signup">Create one</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

