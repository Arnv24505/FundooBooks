"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Form, Input, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import AuthShell from "@/components/auth/AuthShell";
import { api, getApiErrorMessage } from "@/lib/apiClient";

type ResetValues = { password: string; confirm: string };

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [form] = Form.useForm<ResetValues>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onFinish(values: ResetValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/auth/reset-password", { token, password: values.password });
      setDone(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Reset password"
        subtitle="This reset link is missing its token."
      >
        <Result
          status="warning"
          title="Invalid reset link"
          subTitle="Request a new link and open it from the email we send you."
          extra={
            <Button type="primary" href="/forgot-password">
              Request a new link
            </Button>
          }
        />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Result
          status="success"
          title="Password reset successful"
          subTitle="For security, all existing sessions have been signed out."
          extra={
            <Button type="primary" href="/login">
              Continue to login
            </Button>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters, including a letter and a number."
    >
      {formError ? (
        <Alert type="error" showIcon title={formError} style={{ marginBottom: 18 }} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="password"
          label="New password"
          rules={[
            { required: true, message: "Choose a password" },
            { min: 8, message: "Use at least 8 characters" },
            { pattern: /[A-Za-z]/, message: "Include at least one letter" },
            { pattern: /\d/, message: "Include at least one number" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="New password"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
          Reset password
        </Button>
      </Form>
    </AuthShell>
  );
}
