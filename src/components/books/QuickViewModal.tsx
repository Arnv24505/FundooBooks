"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Modal, Rate, Skeleton, Tag } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import Price from "@/components/books/Price";
import { useBook } from "@/hooks/queries";
import { useCart } from "@/hooks/useCart";
import type { Book } from "@/types";

export default function QuickViewModal({
  book,
  open,
  onClose,
}: {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}) {
  const detail = useBook(book?._id ?? "");
  const { add } = useCart();
  const [adding, setAdding] = useState(false);
  const data = detail.data?.data ?? book;

  async function addToBag() {
    if (!data) return;
    setAdding(true);
    await add(data);
    setAdding(false);
    onClose();
  }

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={720} destroyOnHidden>
      {!data ? (
        <Skeleton active />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px minmax(0, 1fr)",
            gap: 24,
            paddingTop: 8,
          }}
        >
          <div
            style={{
              background: "linear-gradient(160deg,#faf6f6,#f1e9ea)",
              borderRadius: 10,
              padding: 18,
              display: "grid",
              placeItems: "center",
            }}
          >
            <BookCover src={data.coverImage} title={data.title} className="book-cover" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.25 }}>{data.title}</h2>
            <p style={{ color: "var(--text-soft)", margin: "0 0 10px" }}>
              by {data.authors?.[0]?.name ?? "Unknown author"}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <Rate disabled allowHalf value={data.rating ?? 0} style={{ fontSize: 13 }} />
              <span style={{ color: "var(--text-soft)", fontSize: 13 }}>({data.reviewCount ?? 0})</span>
            </div>
            <Price price={data.price} originalPrice={data.originalPrice} size="large" />
            <p style={{ color: "#4a4a4a", lineHeight: 1.7, fontSize: 13, margin: "14px 0" }}>
              {detail.data?.data.description?.slice(0, 320) ??
                "Open the book page to read the full description."}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
              {(data.subjects ?? []).slice(0, 3).map((subject) => (
                <Tag key={subject}>{subject}</Tag>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                type="primary"
                icon={<ShoppingOutlined />}
                loading={adding}
                disabled={(data.stock ?? 0) <= 0 || !data.price}
                onClick={() => void addToBag()}
              >
                {(data.stock ?? 0) <= 0 ? "Out of stock" : "Add to bag"}
              </Button>
              <Button href={`/books/${data._id}`}>View details</Button>
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-soft)" }}>
              <Link href={`/books/${data._id}`}>Read description and customer reviews →</Link>
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
