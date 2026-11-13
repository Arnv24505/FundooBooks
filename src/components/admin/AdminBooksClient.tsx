"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Input,
  Popconfirm,
  Skeleton,
  Switch,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import AdminBookFormModal from "@/components/admin/AdminBookFormModal";
import BookCover from "@/components/books/BookCover";
import { useAdminBooks, useDeleteAdminBook } from "@/hooks/admin";
import { getApiErrorMessage } from "@/lib/apiClient";
import { formatINR } from "@/lib/money";
import type { Book } from "@/types";

const PAGE_SIZE = 10;

export default function AdminBooksClient() {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const deleteBook = useDeleteAdminBook();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "1");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const query = useAdminBooks({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    lowStock,
  });

  const books = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  async function remove(book: Book) {
    try {
      await deleteBook.mutateAsync(book._id);
      message.success(`“${book.title}” deleted`);
      if (books.length === 1 && page > 1) setPage((value) => value - 1);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  function openCreate() {
    setFormOpen(true);
  }


  const columns: ColumnsType<Book> = [
      {
        title: "Book",
        key: "book",
        render: (_, book) => (
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 240 }}>
            <BookCover
              src={book.coverImage}
              title={book.title}
              className="admin-book-thumb"
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 300,
                }}
                title={book.title}
              >
                {book.title}
              </div>
              <div style={{ color: "var(--text-soft)", fontSize: 12 }}>
                {book.authors.map((author) => author.name).join(", ") || "Unknown author"}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Price",
        key: "price",
        align: "right",
        render: (_, book) => (
          <div>
            <div style={{ fontWeight: 700 }}>{formatINR(book.price)}</div>
            {book.originalPrice && book.originalPrice > (book.price ?? 0) ? (
              <div style={{ color: "var(--text-soft)", fontSize: 11, textDecoration: "line-through" }}>
                {formatINR(book.originalPrice)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Stock",
        dataIndex: "stock",
        key: "stock",
        align: "center",
        render: (stock: number | undefined) => {
          const value = stock ?? 0;
          const color = value === 0 ? "red" : value <= 3 ? "orange" : "green";
          return <Tag color={color}>{value === 0 ? "Out of stock" : `${value} left`}</Tag>;
        },
      },
      {
        title: "Rating",
        dataIndex: "rating",
        key: "rating",
        align: "center",
        render: (rating: number | undefined) => (rating ? rating.toFixed(1) : "—"),
      },
      {
        title: "Source",
        dataIndex: "isDemoData",
        key: "isDemoData",
        render: (isDemo: boolean) =>
          isDemo ? <Tag>Demo data</Tag> : <Tag color="blue">Catalogue</Tag>,
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_, book) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Link href={`/admin/books/${book._id}`} className="ant-btn ant-btn-sm ant-btn-default">
              <EditOutlined />
              <span>Edit</span>
            </Link>
            <Popconfirm
              title="Delete this book?"
              description="It will be removed from carts and wishlists too."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void remove(book)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${book.title}`} />
            </Popconfirm>
          </div>
        ),
      },
  ];

  return (
    <>
      <div
        className="admin-section"
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}
      >
        <Input.Search
          allowClear
          placeholder="Search title, author or ISBN"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          style={{ maxWidth: 360, flex: "1 1 240px" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch
            checked={lowStock}
            onChange={(checked) => {
              setLowStock(checked);
              setPage(1);
            }}
          />
          <span style={{ fontSize: 13 }}>Low stock only</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ marginLeft: "auto" }}
        >
          Add book
        </Button>
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title="Could not load books. Please refresh." />
      ) : query.isLoading ? (
        <div className="admin-section">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <div className="admin-section">
          <Table<Book>
            rowKey="_id"
            columns={columns}
            dataSource={books}
            scroll={{ x: 900 }}
            locale={{ emptyText: "No books match this view." }}
            pagination={{
              current: pagination?.page ?? page,
              pageSize: pagination?.limit ?? PAGE_SIZE,
              total: pagination?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total.toLocaleString("en-IN")} books`,
              onChange: setPage,
            }}
          />
        </div>
      )}

      <AdminBookFormModal open={formOpen} book={null} onClose={() => setFormOpen(false)} />
    </>
  );
}

