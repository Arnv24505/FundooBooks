"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Skeleton,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AddressFormModal from "@/components/checkout/AddressFormModal";
import { useAddresses } from "@/hooks/queries";
import { api, getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/actions";
import type { Address, ApiEnvelope, SafeUser } from "@/types";

type ProfileValues = { name: string; mobile?: string };
type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AddressDraft = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  label: Address["label"];
};

function AddressCard({
  address,
  index,
  onChanged,
}: {
  address: Address;
  index: number;
  onChanged: (message: string) => Promise<void>;
}) {
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AddressDraft>({
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    label: address.label,
  });

  function reset() {
    setDraft({
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      label: address.label,
    });
  }

  async function save() {
    if (!draft.line1.trim() || !draft.city.trim() || !draft.state.trim() || !draft.pincode.trim()) {
      message.warning("Address, city, state and pincode are required");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/addresses/${address._id}`, {
        label: draft.label,
        line1: draft.line1.trim(),
        line2: draft.line2.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
      });
      await onChanged("Address updated");
      setEditing(false);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api.delete(`/addresses/${address._id}`);
      await onChanged("Address removed");
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <article className="profile-address">
      <div className="profile-address-head">
        <h3>
          {index + 1}.{address.label.toUpperCase()}
        </h3>
        <button
          type="button"
          className="profile-link"
          onClick={() => {
            if (editing) reset();
            setEditing((value) => !value);
          }}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
        <Popconfirm
          title="Delete this address?"
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => void remove()}
        >
          <button type="button" className="profile-link">
            Delete
          </button>
        </Popconfirm>
        <button
          type="button"
          className="profile-save"
          disabled={!editing || saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="profile-address-body">
        <span className="profile-address-caption">Address</span>
        {editing ? (
          <Input.TextArea
            className="profile-address-textarea"
            value={draft.line1}
            autoSize={{ minRows: 2, maxRows: 3 }}
            onChange={(event) => setDraft({ ...draft, line1: event.target.value })}
            aria-label="Address"
          />
        ) : (
          <div className="profile-address-box">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
          </div>
        )}
        {editing ? (
          <Input
            className="profile-address-line2"
            placeholder="Apartment, landmark (optional)"
            value={draft.line2}
            onChange={(event) => setDraft({ ...draft, line2: event.target.value })}
            aria-label="Address line 2"
          />
        ) : null}
      </div>

      <div className="profile-address-grid">
        <div>
          <span className="profile-address-caption">city/town</span>
          {editing ? (
            <Input
              className="profile-address-input"
              value={draft.city}
              onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              aria-label="City"
            />
          ) : (
            <div className="profile-address-value">{address.city}</div>
          )}
        </div>
        <div>
          <span className="profile-address-caption">State</span>
          {editing ? (
            <Input
              className="profile-address-input"
              value={draft.state}
              onChange={(event) => setDraft({ ...draft, state: event.target.value })}
              aria-label="State"
            />
          ) : (
            <div className="profile-address-value">{address.state}</div>
          )}
        </div>
      </div>

      <div className="profile-address-type">
        <span className="profile-address-caption">Type</span>
        <Radio.Group
          value={draft.label}
          disabled={!editing}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        >
          <Radio value="home">Home</Radio>
          <Radio value="work">Work</Radio>
          <Radio value="other">Other</Radio>
        </Radio.Group>
      </div>
    </article>
  );
}

export default function ProfileClient() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const { message } = App.useApp();

  const [profileForm] = Form.useForm<ProfileValues>();
  const [passwordForm] = Form.useForm<PasswordValues>();
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const addresses = useAddresses();

  async function saveProfile(values: ProfileValues) {
    setSavingProfile(true);
    try {
      const { data } = await api.patch<ApiEnvelope<SafeUser>>("/auth/profile", {
        name: values.name.trim(),
        mobile: values.mobile?.trim() ?? "",
      });
      dispatch(setUser(data.data));
      message.success("Profile updated");
      setEditingDetails(false);
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        profileForm.setFields(
          Object.entries(fields).map(([name, msg]) => ({
            name: name as keyof ProfileValues,
            errors: [msg],
          }))
        );
      }
      message.error(getApiErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(values: PasswordValues) {
    if (values.newPassword !== values.confirmPassword) {
      passwordForm.setFields([{ name: "confirmPassword", errors: ["Passwords do not match"] }]);
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/auth/profile", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      setPasswordOpen(false);
      message.success("Password updated. Other sessions have been signed out.");
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  function cancelProfileEdit() {
    profileForm.setFieldsValue({ name: user?.name, mobile: user?.mobile });
    setEditingDetails(false);
  }

  async function refreshAddresses(successMessage: string) {
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    message.success(successMessage);
  }

  if (!user) {
    return (
      <div className="container-account account-page">
        <div className="account-shell account-loading">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  const addressList = addresses.data ?? [];

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home /</Link>
          <span className="breadcrumb-current">Profile</span>
        </div>
      </div>

      <div className="container-account profile-page">
        <Form
          form={profileForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ name: user.name, mobile: user.mobile }}
          onFinish={saveProfile}
          className="profile-form"
        >
          <section className="profile-section" aria-labelledby="personal-heading">
            <div className="profile-section-head">
              <h2 id="personal-heading">Personal Details</h2>
              <button
                type="button"
                className="profile-edit-link"
                onClick={() => {
                  if (editingDetails) cancelProfileEdit();
                  else setEditingDetails(true);
                }}
              >
                {editingDetails ? "Cancel" : "Edit"}
              </button>
              <Button
                htmlType="submit"
                className="profile-save"
                disabled={!editingDetails}
                loading={savingProfile}
              >
                Save
              </Button>
            </div>

            <div className="profile-fields">
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, message: "Enter your name" },
                  { min: 2, message: "Name must be at least 2 characters" },
                ]}
              >
                <Input className="profile-field-input" readOnly={!editingDetails} autoComplete="name" />
              </Form.Item>

              <Form.Item label="Email id">
                <Input className="profile-field-input" value={user.email} readOnly />
              </Form.Item>

              <Form.Item label="Password">
                <div className="profile-password-field">
                  <span className="profile-field-value">************</span>
                  {user.provider === "google" ? (
                    <span className="profile-password-note">Managed by Google</span>
                  ) : (
                    <button
                      type="button"
                      className="profile-link"
                      onClick={() => setPasswordOpen(true)}
                    >
                      Change
                    </button>
                  )}
                </div>
              </Form.Item>

              <Form.Item
                label="Mobile number"
                name="mobile"
                rules={[{ pattern: /^\d{10,15}$/, message: "Enter a valid Mobile number" }]}
              >
                <Input
                  className="profile-field-input"
                  readOnly={!editingDetails}
                  placeholder="Not added"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </Form.Item>
            </div>
          </section>
        </Form>

        <section className="profile-section" aria-labelledby="address-heading">
          <div className="profile-section-head">
            <h2 id="address-heading">Address Details</h2>
            <button
              type="button"
              className="profile-add-link"
              onClick={() => setAddressOpen(true)}
            >
              Add New Address
            </button>
          </div>

          {addresses.isLoading ? (
            <div className="profile-address-list">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : addressList.length === 0 ? (
            <div className="profile-address-list">
              <Empty description="No saved addresses yet." />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddressOpen(true)}
              >
                Add your first address
              </Button>
            </div>
          ) : (
            <div className="profile-address-list">
              {addressList.map((address, index) => (
                <AddressCard
                  key={address._id}
                  address={address}
                  index={index}
                  onChanged={refreshAddresses}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AddressFormModal
        open={addressOpen}
        address={null}
        onClose={() => {
          setAddressOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["addresses"] });
        }}
      />

      <Modal
        open={passwordOpen}
        title="Change password"
        footer={null}
        onCancel={() => setPasswordOpen(false)}
        destroyOnHidden
      >
        <Form
          form={passwordForm}
          layout="vertical"
          requiredMark={false}
          onFinish={changePassword}
        >
          <Form.Item
            name="currentPassword"
            label="Current password"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 8, message: "Use at least 8 characters" },
              { pattern: /[A-Za-z]/, message: "Include a letter" },
              { pattern: /\d/, message: "Include a number" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm new password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingPassword} block>
            Update password
          </Button>
        </Form>
      </Modal>
    </>
  );
}

