"use client";

import { useState } from "react";
import { Alert, App, Avatar, Input, Select, Skeleton, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";
import { useAdminUsers, useUpdateUserRole } from "@/hooks/admin";
import { getApiErrorMessage } from "@/lib/apiClient";
import { formatDateTime, formatOrderDate } from "@/lib/orderStatus";
import { useAppSelector } from "@/store/hooks";
import type { AdminUser } from "@/types";

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: "user", label: "Customer" },
  { value: "admin", label: "Admin" },
];

export default function AdminUsersClient() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const { message, modal } = App.useApp();
  const updateRole = useUpdateUserRole();

  const query = useAdminUsers({ page, limit: PAGE_SIZE, search: search || undefined });
  const users = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  function confirmRoleChange(user: AdminUser, role: AdminUser["role"]) {
    if (role === user.role) return;
    const nextLabel = role === "admin" ? "an admin" : "a customer";
    modal.confirm({
      title: `Make ${user.name} ${nextLabel}?`,
      content:
        role === "admin"
          ? "They will immediately gain access to the admin dashboard. Their existing sessions are signed out."
          : "They will lose admin access. Their existing sessions are signed out.",
      okText: "Change role",
      okButtonProps: { danger: role === "user" },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await updateRole.mutateAsync({ id: user._id, role });
          message.success(`${user.name} is now ${nextLabel}.`);
        } catch (error) {
          message.error(getApiErrorMessage(error));
        }
      },
    });
  }

  const columns: ColumnsType<AdminUser> = [
    {
      title: "Customer",
      key: "customer",
      render: (_, user) => (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar icon={<UserOutlined />} style={{ background: "#ffe7e9", color: "var(--brand)" }}>
            {user.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {user.name}
              {user._id === currentUserId ? (
                <span style={{ color: "var(--text-soft)", fontWeight: 400 }}> (you)</span>
              ) : null}
            </div>
            <div style={{ color: "var(--text-soft)", fontSize: 12 }}>{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      render: (value: string | undefined) => value || "—",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: AdminUser["role"], user) => {
        const isSelf = user._id === currentUserId;
        const saving = updateRole.isPending && updateRole.variables?.id === user._id;
        return (
          <Tooltip title={isSelf ? "You cannot change your own role." : undefined}>
            <Select<AdminUser["role"]>
              size="small"
              value={role}
              options={ROLE_OPTIONS}
              disabled={isSelf}
              loading={saving}
              onChange={(nextRole) => confirmRoleChange(user, nextRole)}
              style={{ width: 118 }}
              aria-label={`Role for ${user.name}`}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Sign-in",
      dataIndex: "provider",
      key: "provider",
      render: (provider: AdminUser["provider"]) =>
        provider === "google" ? <Tag color="blue">Google</Tag> : <Tag>Email</Tag>,
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatOrderDate(value),
    },
    {
      title: "Last login",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (value: string | undefined) => (value ? formatDateTime(value) : "—"),
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
          placeholder="Search name or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          style={{ maxWidth: 360, flex: "1 1 240px" }}
        />
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title="Could not load customers. Please refresh." />
      ) : query.isLoading ? (
        <div className="admin-section">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <div className="admin-section">
          <Table<AdminUser>
            rowKey="_id"
            columns={columns}
            dataSource={users}
            scroll={{ x: 760 }}
            locale={{ emptyText: "No customers match this view." }}
            pagination={{
              current: pagination?.page ?? page,
              pageSize: pagination?.limit ?? PAGE_SIZE,
              total: pagination?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total.toLocaleString("en-IN")} customers`,
              onChange: setPage,
            }}
          />
        </div>
      )}
    </>
  );
}

