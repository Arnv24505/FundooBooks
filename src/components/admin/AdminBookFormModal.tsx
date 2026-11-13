"use client";

import type { NamePath } from "antd/es/form/interface";
import { useEffect } from "react";
import { App, Button, Form, Input, InputNumber, Modal } from "antd";
import { getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { useCreateAdminBook, useUpdateAdminBook } from "@/hooks/admin";
import type { AdminBookPayload } from "@/hooks/admin";
import type { Book } from "@/types";

type BookFormValues = {
  title: string;
  authors: string;
  subjects?: string;
  languages?: string;
  price: number;
  originalPrice?: number | null;
  stock: number;
  publisher?: string;
  binding?: string;
  isbn?: string;
  coverImage?: string;
  description?: string;
};

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toPayload(values: BookFormValues): AdminBookPayload {
  const authors = splitList(values.authors);
  return {
    title: values.title.trim(),
    authors: authors.map((name) => ({ name })),
    subjects: splitList(values.subjects),
    languages: splitList(values.languages).length ? splitList(values.languages) : ["en"],
    price: Number(values.price),
    originalPrice:
      values.originalPrice !== null && values.originalPrice !== undefined && values.originalPrice !== 0
        ? Number(values.originalPrice)
        : undefined,
    stock: Number(values.stock ?? 0),
    publisher: values.publisher?.trim() || undefined,
    binding: values.binding?.trim() || undefined,
    isbn: values.isbn?.trim() || undefined,
    coverImage: values.coverImage?.trim() || undefined,
    description: values.description?.trim() || undefined,
  };
}

export function getBookFormValues(book?: Book | null): Partial<BookFormValues> {
  if (!book) return { languages: "en", stock: 0, price: 199 };
  return {
    title: book.title ?? "",
    authors: (book.authors ?? []).map((author) => author.name).join(", "),
    subjects: (book.subjects ?? []).join(", "),
    languages: ((book.languages?.length ? book.languages : ["en"]) ?? ["en"]).join(", "),
    price: book.price ?? 199,
    originalPrice: book.originalPrice ?? null,
    stock: book.stock ?? 0,
    publisher: book.publisher ?? "",
    binding: book.binding ?? "",
    isbn: book.isbn ?? "",
    coverImage: book.coverImage ?? "",
    description: book.description ?? "",
  };
}

export function AdminBookForm({
  form,
  book,
  onFinish,
  onCancel,
  saving,
  submitLabel,
}: {
  form: ReturnType<typeof Form.useForm<BookFormValues>>[0];
  book?: Book | null;
  onFinish: (values: BookFormValues) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
  submitLabel?: string;
}) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: "Enter the book title" }]}
      >
        <Input placeholder="e.g. Pride and Prejudice" maxLength={300} />
      </Form.Item>

      <div className="address-grid">
        <Form.Item
          name="authors"
          label="Authors (comma separated)"
          rules={[{ required: true, message: "Add at least one author" }]}
        >
          <Input placeholder="Jane Austen" />
        </Form.Item>
        <Form.Item name="subjects" label="Subjects / categories (comma separated)">
          <Input placeholder="Fiction, Romance" />
        </Form.Item>
      </div>

      <div className="address-grid">
        <Form.Item
          name="price"
          label="Selling price (₹)"
          rules={[{ required: true, message: "Enter the price" }]}
        >
          <InputNumber min={0} max={1_000_000} precision={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="originalPrice" label="List price (₹, optional)">
          <InputNumber min={0} max={1_000_000} precision={0} style={{ width: "100%" }} />
        </Form.Item>
      </div>

      <div className="address-grid">
        <Form.Item
          name="stock"
          label="Stock on hand"
          rules={[{ required: true, message: "Enter the stock count" }]}
        >
          <InputNumber min={0} max={100_000} precision={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="languages" label="Languages (comma separated)">
          <Input placeholder="en" />
        </Form.Item>
      </div>

      <div className="address-grid">
        <Form.Item name="publisher" label="Publisher">
          <Input placeholder="Project Gutenberg" maxLength={120} />
        </Form.Item>
        <Form.Item name="binding" label="Binding">
          <Input placeholder="Paperback" maxLength={40} />
        </Form.Item>
      </div>

      <div className="address-grid">
        <Form.Item name="isbn" label="ISBN">
          <Input placeholder="9780000000000" maxLength={20} />
        </Form.Item>
        <Form.Item name="coverImage" label="Cover image URL">
          <Input placeholder="https://www.gutenberg.org/..." />
        </Form.Item>
      </div>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={4} maxLength={5000} showCount />
      </Form.Item>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
        <Button type="primary" htmlType="submit" loading={saving}>
          {submitLabel ?? (book ? "Save changes" : "Add book")}
        </Button>
      </div>
    </Form>
  );
}

export default function AdminBookFormModal({
  open,
  book,
  onClose,
}: {
  open: boolean;
  book?: Book | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<BookFormValues>();
  const { message } = App.useApp();
  const createBook = useCreateAdminBook();
  const updateBook = useUpdateAdminBook();
  const saving = createBook.isPending || updateBook.isPending;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(getBookFormValues(book));
  }, [open, book, form]);

  async function onFinish(values: BookFormValues) {
    const authors = splitList(values.authors);
    if (authors.length === 0) {
      form.setFields([{ name: "authors", errors: ["Add at least one author"] }]);
      return;
    }

    const payload = toPayload(values);
    const cover = values.coverImage?.trim();
    if (cover && !/^https?:\/\//i.test(cover)) {
      form.setFields([{ name: "coverImage", errors: ["Enter a valid URL starting with http:// or https://"] }]);
      return;
    }

    try {
      if (book?._id) {
        await updateBook.mutateAsync({ id: book._id, payload });
        message.success("Book updated");
      } else {
        await createBook.mutateAsync(payload);
        message.success("Book added to the catalogue");
      }
      onClose();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        form.setFields(
          Object.entries(fields).map(([name, msg]) => ({
            name: name as NamePath,
            errors: [msg],
          }))
        );
      }
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      forceRender
      title={book ? "Edit book" : "Add book"}
    >
      <AdminBookForm form={form} book={book} onFinish={onFinish} onCancel={onClose} saving={saving} />
    </Modal>
  );
}

export { toPayload, splitList };
