"use client";

import { useEffect, useState } from "react";
import { App, Button, Form, Input, Modal, Select, Switch } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage, getFieldErrors } from "@/lib/apiClient";
import type { Address, ApiEnvelope } from "@/types";

type AddressFormValues = {
  label: "home" | "work" | "other";
  fullName: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export default function AddressFormModal({
  open,
  onClose,
  address,
  prefill,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  address?: Address | null;
  prefill?: { line2?: string };
  onSaved?: (address: Address) => void;
}) {
  const [form] = Form.useForm<AddressFormValues>();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (address) {
      form.setFieldsValue({
        label: address.label,
        fullName: address.fullName,
        mobile: address.mobile,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: Boolean(address.isDefault),
      });
    } else {
      form.setFieldsValue({ label: "home", isDefault: false, ...prefill });
    }
  }, [open, address, prefill, form]);

  async function onFinish(values: AddressFormValues) {
    setSaving(true);
    try {
      const { data } = address
        ? await api.patch<ApiEnvelope<Address>>(`/addresses/${address._id}`, values)
        : await api.post<ApiEnvelope<Address>>("/addresses", values);
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      message.success(address ? "Address updated" : "Address saved");
      onSaved?.(data.data);
      onClose();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        form.setFields(
          Object.entries(fields).map(([name, msg]) => ({
            name: name as keyof AddressFormValues,
            errors: [msg],
          }))
        );
      }
      message.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={address ? "Edit address" : "Add new address"}
      width={620}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="label" label="Type" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "home", label: "Home" },
              { value: "work", label: "Work" },
              { value: "other", label: "Other" },
            ]}
          />
        </Form.Item>

        <div className="address-grid">
          <Form.Item
            name="fullName"
            label="Full name"
            rules={[{ required: true, message: "Enter the recipient's name" }]}
          >
            <Input placeholder="Full name" autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="mobile"
            label="Mobile number"
            rules={[
              { required: true, message: "Enter a mobile number" },
              { pattern: /^\d{10,15}$/, message: "Enter a valid mobile number" },
            ]}
          >
            <Input placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel" />
          </Form.Item>
        </div>

        <Form.Item
          name="line1"
          label="Address"
          rules={[
            { required: true, message: "Enter the address" },
            { min: 5, message: "Enter a fuller address" },
          ]}
        >
          <Input.TextArea
            rows={2}
            maxLength={200}
            placeholder="Flat / house no., building, street, area"
            autoComplete="address-line1"
          />
        </Form.Item>
        <Form.Item name="line2" label="Landmark (optional)">
          <Input placeholder="Nearby landmark" maxLength={200} autoComplete="address-line2" />
        </Form.Item>

        <div className="address-grid">
          <Form.Item
            name="city"
            label="City / town"
            rules={[{ required: true, message: "Enter the city" }]}
          >
            <Input placeholder="Bengaluru" autoComplete="address-level2" />
          </Form.Item>
          <Form.Item
            name="state"
            label="State"
            rules={[{ required: true, message: "Enter the state" }]}
          >
            <Input placeholder="Karnataka" autoComplete="address-level1" />
          </Form.Item>
        </div>

        <div className="address-grid">
          <Form.Item
            name="pincode"
            label="Pincode"
            rules={[
              { required: true, message: "Enter the pincode" },
              { pattern: /^\d{6}$/, message: "Enter a valid 6-digit pincode" },
            ]}
          >
            <Input placeholder="560034" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
          </Form.Item>
          <Form.Item name="isDefault" label="Make default" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {address ? "Save address" : "Add address"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
