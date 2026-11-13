"use client";

import Link from "next/link";
import { Button, Divider, Empty, Skeleton, Tag } from "antd";
import BookCover from "@/components/books/BookCover";
import { formatINR } from "@/lib/money";
import { useOrder } from "@/hooks/queries";
import type { OrderStatus } from "@/types";
import { orderDate } from "@/components/orders/OrdersClient";

const FLOW: Array<{ status: OrderStatus; label: string }> = [
  { status: "placed", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: "orange",
  confirmed: "blue",
  shipped: "geekblue",
  delivered: "green",
  cancelled: "red",
};

export default function OrderDetailClient({ id }: { id: string }) {
  const order = useOrder(id);
  const data = order.data;

  if (order.isLoading) {
    return (
      <div className="container-page" style={{ padding: "30px 24px 56px" }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-page" style={{ padding: "30px 24px 56px" }}>
        <div className="empty-state">
          <Empty description="We couldn't find this order." />
          <Button type="primary" href="/orders" style={{ marginTop: 16 }}>
            Back to my orders
          </Button>
        </div>
      </div>
    );
  }

  const currentIndex = FLOW.findIndex((entry) => entry.status === data.status);
  const cancelled = data.status === "cancelled";

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/orders">My orders</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{data.orderNumber}</span>
        </div>
      </div>

      <div className="container-page" style={{ paddingTop: 26, paddingBottom: 56 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {data.orderNumber}
          </h1>
          <Tag color={STATUS_COLORS[data.status]} style={{ textTransform: "capitalize" }}>
            {data.status}
          </Tag>
        </div>
        <p style={{ color: "var(--text-soft)", marginTop: 6 }}>
          Placed on {orderDate(data.createdAt)} · Cash on delivery
        </p>

        {cancelled ? (
          <div className="panel" style={{ borderColor: "#f0c2c8", background: "#fff7f8" }}>
            <strong style={{ color: "var(--brand)" }}>This order was cancelled.</strong>
            <p style={{ margin: "6px 0 0", color: "var(--text-soft)", fontSize: 13 }}>
              Stock has been returned to the catalogue. Contact support if you need help.
            </p>
          </div>
        ) : (
          <div className="steps">
            {FLOW.map((entry, index) => (
              <div
                key={entry.status}
                className={`step ${index === currentIndex ? "active" : ""} ${
                  index < currentIndex ? "done" : ""
                }`}
              >
                <span className="step-index">{index < currentIndex ? "✓" : index + 1}</span>
                {entry.label}
              </div>
            ))}
          </div>
        )}

        <div className="checkout-grid">
          <div>
            <div className="panel">
              <h2 className="panel-title">Items ({data.items.length})</h2>
              {data.items.map((item) => (
                <div className="cart-line" key={`${data._id}-${item.bookId}`}>
                  <BookCover src={item.coverImage} title={item.title} className="cart-thumb" />
                  <div>
                    <Link href={`/books/${item.bookId}`}>
                      <h3 className="cart-line-title">{item.title}</h3>
                    </Link>
                    <p className="cart-line-meta">by {item.author}</p>
                    <p className="cart-line-meta">
                      {formatINR(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="price-now">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="panel">
              <h2 className="panel-title">Delivery address</h2>
              <div className="address-label">
                {data.shippingAddress.label}
              </div>
              <p style={{ margin: "8px 0 2px", fontWeight: 700 }}>
                {data.shippingAddress.fullName}
              </p>
              <p className="address-text">
                {data.shippingAddress.line1}
                {data.shippingAddress.line2 ? `, ${data.shippingAddress.line2}` : ""}
                <br />
                {data.shippingAddress.city}, {data.shippingAddress.state}{" "}
                {data.shippingAddress.pincode}
                <br />
                {data.shippingAddress.mobile}
              </p>
            </div>
          </div>

          <aside>
            <div className="panel">
              <h2 className="panel-title">Payment summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatINR(data.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{data.shippingFee === 0 ? "Free" : formatINR(data.shippingFee)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(data.total)}</span>
              </div>
              <Divider style={{ margin: "14px 0" }} />
              <p style={{ margin: 0, fontSize: 13, color: "#4a4a4a" }}>
                Payment method: <strong>Cash on delivery</strong>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                Pay {formatINR(data.total)} when your order arrives.
              </p>
            </div>

            <div className="panel">
              <h2 className="panel-title">Status history</h2>
              {data.statusHistory.map((entry, index) => (
                <div className="summary-row" key={`${entry.status}-${index}`}>
                  <span style={{ textTransform: "capitalize" }}>{entry.status}</span>
                  <span style={{ color: "var(--text-soft)" }}>{orderDate(entry.at)}</span>
                </div>
              ))}
            </div>

            <Button block href="/orders" style={{ marginTop: 16 }}>
              Back to my orders
            </Button>
          </aside>
        </div>
      </div>
    </>
  );
}

