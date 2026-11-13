"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Form, Skeleton } from "antd";
import type { NamePath } from "antd/es/form/interface";
import { ArrowLeftOutlined } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import { AdminBookForm, getBookFormValues, splitList, toPayload } from "@/components/admin/AdminBookFormModal";
import { useAdminBook, useUpdateAdminBook } from "@/hooks/admin";
import { getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";

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

export default function AdminBookEditClient({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [form] = Form.useForm<BookFormValues>();
  const { message } = App.useApp();
  const query = useAdminBook(bookId);
  const updateBook = useUpdateAdminBook();
  const book = query.data;

  useEffect(() => {
    if (!book) return;
    form.setFieldsValue(getBookFormValues(book));
  }, [book, form]);

  async function onFinish(values: BookFormValues) {
    const authors = splitList(values.authors);
    if (authors.length === 0) {
      form.setFields([{ name: "authors", errors: ["Add at least one author"] }]);
      return;
    }

    const cover = values.coverImage?.trim();
    if (cover && !/^https?:\/\//i.test(cover)) {
      form.setFields([
        { name: "coverImage", errors: ["Enter a valid URL starting with http:// or https://"] },
      ]);
      return;
    }

    try {
      await updateBook.mutateAsync({ id: bookId, payload: toPayload(values) });
      message.success("Book updated");
      router.push("/admin/books");
      router.refresh();
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

  if (query.isLoading) {
    return (
      <div className="admin-section">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (query.isError || !book) {
    return (
      <div className="admin-section" style={{ display: "grid", gap: 12 }}>
        <Alert
          type="error"
          showIcon
          title="Could not load this book"
          description={getApiErrorMessage(query.error) || "The book may not exist or you may not have access."}
        />
        <div>
          <Link href="/admin/books">Back to books</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/books")}>
          Back
        </Button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Edit book</div>
          <div style={{ color: "var(--text-soft)", fontSize: 13 }}>
            {book.title}
            {book.sourceId && book.sourceId > 0 ? ` · Gutenberg #${book.sourceId}` : " · Custom/admin book"}
          </div>
        </div>
      </div>

      <div className="admin-section" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 84, height: 120, borderRadius: 6, overflow: "hidden", background: "var(--surface-muted, #f5f5f5)", flex: "none" }}>
            <BookCover src={book.coverImage} title={book.title} className="admin-book-edit-cover" />
          </div>
          <div style={{ minWidth: 220, color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6 }}>
            <div><strong style={{ color: "var(--text)" }}>ID:</strong> {book._id}</div>
            <div><strong style={{ color: "var(--text)" }}>Demo data:</strong> {book.isDemoData ? "Yes" : "No"}</div>
            <div><strong style={{ color: "var(--text)" }}>Rating:</strong> {book.rating ? `${book.rating} (${book.reviewCount ?? 0})` : "—"}</div>
          </div>
        </div>

        <AdminBookForm
          form={form}
          book={book}
          onFinish={onFinish}
          onCancel={() => router.push("/admin/books")}
          saving={updateBook.isPending}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}