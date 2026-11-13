"use client";

import { useSearchParams } from "next/navigation";
import { Button, Skeleton } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { formatINR } from "@/lib/money";
import { useOrder } from "@/hooks/queries";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const order = useOrder(id);
  const data = order.data;

  return (
    <div className="container-page">
      <div className="success-wrap">
        <div className="success-mark">
          <CheckOutlined />
        </div>
        <h1 className="success-title">Order placed successfully</h1>
        <p className="success-sub">
          Hurray! Your order is confirmed.
          {data ? (
            <>
              {"\n"}Your order id is #{data.orderNumber} save the order id for
              {"\n"}further communication..
            </>
          ) : (
            "\nthe order id is saved for further communication."
          )}
        </p>

        {id ? (
          order.isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 20 }} />
          ) : data ? (
            <p style={{ color: "var(--text-soft)", fontSize: 13 }}>
              {data.items.length} item{data.items.length === 1 ? "" : "s"} ·{" "}
              {formatINR(data.total)} payable on delivery
            </p>
          ) : null
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Button type="primary" className="btn-xd-blue" size="large" href="/">
            Continue shopping
          </Button>
          {id ? (
            <Button size="large" href={`/orders/${id}`}>
              View order
            </Button>
          ) : (
            <Button size="large" href="/orders">
              My orders
            </Button>
          )}
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <h4>Email us</h4>
            <a href="mailto:admin@bookstore.com">admin@bookstore.com</a>
          </div>
          <div className="contact-card">
            <h4>Contact us</h4>
            <a href="tel:+918163475881">+91 81634 75881</a>
          </div>
          <div className="contact-card">
            <h4>Address</h4>
            42, 14th Main, 15th Cross, Sector 4, opp. BDA complex, near Kumarakom restaurant, HSR
            Layout, Bangalore 560034
          </div>
        </div>
      </div>
    </div>
  );
}



