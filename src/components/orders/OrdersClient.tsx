"use client";

import Link from "next/link";
import { Button, Empty, Skeleton } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import { formatINR } from "@/lib/money";
import { formatAuthorName } from "@/lib/format";
import { useOrders } from "@/hooks/queries";
import type { Order, OrderStatus } from "@/types";

export function orderDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function placedLabel(order: Order): { text: string; status: OrderStatus } {
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
  switch (order.status) {
    case "delivered":
      return { text: `Delivered on ${date}`, status: order.status };
    case "cancelled":
      return { text: `Cancelled on ${date}`, status: order.status };
    case "shipped":
      return { text: `Shipped on ${date}`, status: order.status };
    default:
      return { text: `Order Placed on ${date}`, status: order.status };
  }
}

export default function OrdersClient() {
  const orders = useOrders();
  const list = orders.data ?? [];

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home /</Link>
          <span className="breadcrumb-current">My Order</span>
        </div>
      </div>

      <div className="container-account account-page">
        {orders.isLoading ? (
          <div className="account-shell account-loading">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : list.length === 0 ? (
          <div className="account-shell account-empty">
            <Empty description="You haven't placed an order yet." />
            <Button type="primary" href="/" icon={<ShoppingOutlined />} style={{ marginTop: 16 }}>
              Start shopping
            </Button>
          </div>
        ) : (
          <div className="order-list">
            {list.map((order) => {
              const item = order.items[0];
              const placed = placedLabel(order);
              return (
                <article className="order-row" key={order._id}>
                  <Link href={`/orders/${order._id}`} className="order-info">
                    <BookCover
                      src={item?.coverImage}
                      title={item?.title ?? "Order"}
                      className="order-cover"
                    />
                    <div className="order-info-body">
                      <span className="order-book-title">{item?.title ?? "Order"}</span>
                      <p className="order-book-author">
                        by {formatAuthorName(item?.author)}
                        {order.items.length > 1 ? ` · +${order.items.length - 1} more` : ""}
                      </p>
                      <div className="order-price">
                        <span className="price-now">{formatINR(item?.price ?? order.total)}</span>
                        {item?.originalPrice !== undefined &&
                        item?.price !== undefined &&
                        item.originalPrice > item.price ? (
                          <span className="price-was">{formatINR(item.originalPrice)}</span>
                        ) : null}
                      </div>
                    </div>
                  </Link>

                  <div className="order-status-col">
                    <div className={`order-placed ${placed.status}`}>
                      <span className="order-dot" />
                      {placed.text}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}



