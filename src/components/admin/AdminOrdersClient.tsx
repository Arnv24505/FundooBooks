"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import {
  useAdminOrder,
  useAdminOrders,
  useUpdateOrderStatus,
} from "@/hooks/admin";
import { getApiErrorMessage } from "@/lib/apiClient";
import { formatINR } from "@/lib/money";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  formatDateTime,
  formatOrderDate,
} from "@/lib/orderStatus";
import type { AdminOrder, OrderStatus } from "@/types";

const PAGE_SIZE = 10;

function customerOf(order: AdminOrder): { name: string; email?: string } {
  const user = order.userId;
  if (user && typeof user === "object") {
    return { name: user.name, email: user.email };
  }
  return { name: order.customer?.fullName ?? "—" };
}

export default function AdminOrdersClient() {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const updateStatus = useUpdateOrderStatus();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const query = useAdminOrders({ page, limit: PAGE_SIZE, search: search || undefined, status });
  const orders = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  async function changeStatus(order: AdminOrder, next: OrderStatus) {
    try {
      await updateStatus.mutateAsync({ id: order._id, status: next });
      message.success(`${order.orderNumber} marked ${ORDER_STATUS_LABELS[next].toLowerCase()}`);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  const columns: ColumnsType<AdminOrder> = [
    {
      title: "Order",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (value: string, order) => (
        <div>
          <div style={{ fontWeight: 700 }}>{value}</div>
          <div style={{ color: "var(--text-soft)", fontSize: 12 }}>{formatOrderDate(order.createdAt)}</div>
        </div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, order) => {
        const customer = customerOf(order);
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{customer.name}</div>
            {customer.email ? (
              <div style={{ color: "var(--text-soft)", fontSize: 12 }}>{customer.email}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Items",
      key: "items",
      align: "center",
      render: (_, order) =>
        order.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("en-IN"),
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
      key: "status",
      render: (_, order) => (
        <Select<OrderStatus>
          size="small"
          value={order.status}
          style={{ minWidth: 130 }}
          options={ORDER_STATUS_OPTIONS}
          disabled={order.status === "cancelled"}
          loading={updateStatus.isPending && updateStatus.variables?.id === order._id}
          onChange={(next) => void changeStatus(order, next)}
          aria-label={`Status for ${order.orderNumber}`}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, order) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailId(order._id)}>
          View
        </Button>
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
          placeholder="Search order number"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          style={{ maxWidth: 320, flex: "1 1 220px" }}
        />
        <Select<OrderStatus>
          allowClear
          placeholder="All statuses"
          style={{ minWidth: 170 }}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={ORDER_STATUS_OPTIONS}
        />
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title="Could not load orders. Please refresh." />
      ) : query.isLoading ? (
        <div className="admin-section">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <div className="admin-section">
          <Table<AdminOrder>
            rowKey="_id"
            columns={columns}
            dataSource={orders}
            scroll={{ x: 860 }}
            locale={{ emptyText: "No orders match this view." }}
            pagination={{
              current: pagination?.page ?? page,
              pageSize: pagination?.limit ?? PAGE_SIZE,
              total: pagination?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total.toLocaleString("en-IN")} orders`,
              onChange: setPage,
            }}
          />
        </div>
      )}

      <AdminOrderDrawer
        id={detailId}
        onClose={() => setDetailId(null)}
        onStatusChange={(order, next) => void changeStatus(order, next)}
      />
    </>
  );
}

function AdminOrderDrawer({
  id,
  onClose,
  onStatusChange,
}: {
  id: string | null;
  onClose: () => void;
  onStatusChange: (order: AdminOrder, status: OrderStatus) => void;
}) {
  const query = useAdminOrder(id);
  const order = query.data;
  const customer = order ? customerOf(order) : null;
  const address = order?.shippingAddress;

  return (
    <Drawer open={Boolean(id)} onClose={onClose} size={560} title="Order details" destroyOnHidden>
      {query.isLoading || !order ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{order.orderNumber}</div>
              <div style={{ color: "var(--text-soft)", fontSize: 13 }}>
                {formatDateTime(order.createdAt)}
              </div>
            </div>
            <Tag color={ORDER_STATUS_COLORS[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Tag>
          </div>

          <div style={{ margin: "18px 0" }}>
            <Select<OrderStatus>
              value={order.status}
              style={{ width: "100%" }}
              options={ORDER_STATUS_OPTIONS}
              disabled={order.status === "cancelled"}
              onChange={(next) => onStatusChange(order, next)}
            />
            <p style={{ color: "var(--text-soft)", fontSize: 12, margin: "6px 0 0" }}>
              Cancelling an order restores the stock automatically.
            </p>
          </div>

          <Descriptions column={1} size="small" bordered style={{ marginBottom: 18 }}>
            <Descriptions.Item label="Customer">{customer?.name}</Descriptions.Item>
            {customer?.email ? (
              <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label="Mobile">{order.customer?.mobile ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Payment">Cash on delivery</Descriptions.Item>
            <Descriptions.Item label="Ship to">
              {address
                ? `${address.fullName}, ${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.city}, ${address.state} ${address.pincode}`
                : "—"}
            </Descriptions.Item>
          </Descriptions>

          <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Items</h3>
          <div>
            {order.items.map((item) => (
              <div
                key={item.bookId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: "1px solid #eee",
                }}
              >
                <BookCover src={item.coverImage} title={item.title} className="admin-order-thumb" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                  <div style={{ color: "var(--text-soft)", fontSize: 12 }}>
                    {item.author} · Qty {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{formatINR(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #eee", marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>Subtotal</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>Shipping</span>
              <span>{order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0 0",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>

          <h3 style={{ fontSize: 14, margin: "22px 0 10px" }}>Status history</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {order.statusHistory.map((entry, index) => (
              <div
                key={`${entry.status}-${index}`}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
              >
                <Tag color={ORDER_STATUS_COLORS[entry.status]}>
                  {ORDER_STATUS_LABELS[entry.status]}
                </Tag>
                <span style={{ color: "var(--text-soft)" }}>{formatDateTime(entry.at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Drawer>
  );
}

