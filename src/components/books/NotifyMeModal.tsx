"use client";

import { useState } from "react";
import { App, Button, Form, Input, Modal } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { useAppSelector } from "@/store/hooks";
import type { Book } from "@/types";

export default function NotifyMeModal({
  book,
  open,
  onClose,
}: {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const [form] = Form.useForm<{ email: string }>();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  async function submit(values: { email: string }) {
    if (!book) return;
    setSaving(true);
    try {
      await api.post("/stock-alerts", { bookId: book._id, email: values.email });
      message.success("We'll email you as soon as this title is back in stock.");
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Notify me when back in stock"
      destroyOnHidden
    >
      <p style={{ color: "var(--text-soft)", marginTop: 0 }}>
        {book ? `We'll let you know when “${book.title}” is available again.` : ""}
      </p>
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ email: user?.email ?? "" }}
      >
        <Form.Item
          name="email"
          label="Email address"
          rules={[
            { required: true, message: "Enter your email address" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={saving}>
          Notify me
        </Button>
      </Form>
    </Modal>
  );
}

