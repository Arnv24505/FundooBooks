"use client";

import Link from "next/link";
import { Alert, Button, Skeleton, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowRightOutlined,
  BookOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useAdminStats } from "@/hooks/admin";
import { formatINR } from "@/lib/money";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatOrderDate,
} from "@/lib/orderStatus";
import type { Order } from "@/types";

const columns: ColumnsType<Order> = [
  {
    title: "Order",
    dataIndex: "orderNumber",
    key: "orderNumber",
    render: (value: string, order) => (
      <Link href={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}>
        <span style={{ fontWeight: 600 }}>{value}</span>
      </Link>
    ),
  },
  {
    title: "Customer",
    key: "customer",
    render: (_, order) => order.customer?.fullName ?? "—",
  },
  {
    title: "Placed",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (value: string) => formatOrderDate(value),
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    align: "right",
    render: (value: number) => <strong>{formatINR(value)}</strong>,
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: Order["status"]) => (
      <Tag color={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status]}</Tag>
    ),
  },
];

export default function AdminDashboardClient() {
  const stats = useAdminStats();
  const data = stats.data;

  if (stats.isLoading) {
    return (
      <div className="admin-section">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (stats.isError || !data) {
    return (
      <Alert
        type="error"
        showIcon
        title="Could not load dashboard"
        description="Please refresh the page or check that the database is reachable."
      />
    );
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Revenue (COD)</div>
          <div className="value">{formatINR(data.revenue)}</div>
          <div style={{ color: "var(--text-soft)", fontSize: 12, marginTop: 4 }}>
            Excludes cancelled orders
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Orders</div>
          <div className="value">{data.orders.toLocaleString("en-IN")}</div>
          <div style={{ color: "var(--text-soft)", fontSize: 12, marginTop: 4 }}>
            {data.pending.toLocaleString("en-IN")} awaiting fulfilment
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Books</div>
          <div className="value">{data.books.toLocaleString("en-IN")}</div>
          <div style={{ color: "var(--text-soft)", fontSize: 12, marginTop: 4 }}>
            {data.lowStock.toLocaleString("en-IN")} with low stock
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Customers</div>
          <div className="value">{data.customers.toLocaleString("en-IN")}</div>
          <div style={{ color: "var(--text-soft)", fontSize: 12, marginTop: 4 }}>
            Registered shoppers
          </div>
        </div>
      </div>

      {data.lowStock > 0 ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          title={`${data.lowStock.toLocaleString("en-IN")} book(s) have 3 or fewer copies left`}
          action={
            <Button size="small" href="/admin/books?lowStock=1">
              Review stock
            </Button>
          }
        />
      ) : null}

      <div className="admin-dashboard-grid">
        <section className="admin-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0 }}>Recent orders</h2>
            <Link href="/admin/orders" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 600 }}>
              View all <ArrowRightOutlined />
            </Link>
          </div>
          <Table<Order>
            rowKey="_id"
            columns={columns}
            dataSource={data.recentOrders}
            pagination={false}
            size="middle"
            scroll={{ x: 640 }}
            locale={{ emptyText: "No orders yet" }}
          />
        </section>

        <aside className="admin-section">
          <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Quick actions</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <Button block icon={<BookOutlined />} href="/admin/books">
              Manage catalogue
            </Button>
            <Button block icon={<ShoppingOutlined />} href="/admin/orders">
              Fulfil orders
            </Button>
            <Button block icon={<TeamOutlined />} href="/admin/users">
              View customers
            </Button>
            <Button block type="primary" href="/">
              Open storefront
            </Button>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 10,
              background: "#fafafa",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#555",
            }}
          >
            <strong style={{ display: "block", color: "#2a2a2a", marginBottom: 4 }}>
              Storefront pricing
            </strong>
            Prices, stock and ratings imported from the demo catalogue are marked as demo data.
            Saving a book in the admin keeps those fields under your control.
          </div>
        </aside>
      </div>
    </>
  );
}

