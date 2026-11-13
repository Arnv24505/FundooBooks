"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Dropdown, Empty, Popconfirm, Skeleton } from "antd";
import type { MenuProps } from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ShoppingOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import AddressFormModal from "@/components/checkout/AddressFormModal";
import BookCover from "@/components/books/BookCover";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { formatINR } from "@/lib/money";
import { useAddresses } from "@/hooks/queries";
import { useCart } from "@/hooks/useCart";
import { useAppSelector } from "@/store/hooks";
import type { Address, ApiEnvelope, Order } from "@/types";

type Step = "cart" | "address" | "summary";

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function CartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const { cart, isLoading, update, remove } = useCart();
  const addresses = useAddresses();

  const rawStep = searchParams.get("step");
  const step: Step = rawStep === "summary" ? "summary" : rawStep === "address" ? "address" : "cart";
  const addressExpanded = step === "address" || step === "summary";
  const summaryExpanded = step === "summary";

  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressDraft, setAddressDraft] = useState<{ line2?: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  const addressList = addresses.data ?? [];
  const selectedAddress =
    addressList.find((entry) => entry._id === pickedAddressId) ??
    addressList.find((entry) => entry.isDefault) ??
    addressList[0] ??
    null;
  const selectedAddressId = selectedAddress?._id ?? null;

  useEffect(() => {
    if (ready && !user && step !== "cart") {
      router.replace(`/login?next=${encodeURIComponent(`/cart?step=${step}`)}`);
    }
  }, [ready, user, step, router]);

  function goTo(nextStep: Step) {
    if (nextStep !== "cart" && !user) {
      router.push(`/login?next=${encodeURIComponent(`/cart?step=${nextStep}`)}`);
      return;
    }
    router.push(`/cart?step=${nextStep}`, { scroll: false });
  }

  function openNewAddress(draft?: { line2?: string }) {
    setEditingAddress(null);
    setAddressDraft(draft ?? null);
    setAddressOpen(true);
  }

  function captureCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      message.info("Location is not available in this browser. Add your address instead.");
      openNewAddress();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        openNewAddress({ line2: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` });
        message.success("Current location captured — add your street details to save it.");
      },
      () => {
        message.info("Location permission was denied. Add your address instead.");
        openNewAddress();
      },
      { timeout: 8000 }
    );
  }

  const locationItems: MenuProps["items"] = [
    ...addressList.map((address) => ({
      key: address._id,
      label: (
        <span>
          <strong style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 0.6 }}>
            {address.label}
          </strong>{" "}
          {address.line1}
        </span>
      ),
    })),
    ...(addressList.length ? [{ type: "divider" as const }] : []),
    { key: "add", label: "Add New Address", icon: <PlusOutlined /> },
    { key: "current", label: "Use current location", icon: <EnvironmentOutlined /> },
  ];

  function onLocationMenuClick({ key }: { key: string }) {
    if (key === "add") {
      openNewAddress();
      return;
    }
    if (key === "current") {
      captureCurrentLocation();
      return;
    }
    setPickedAddressId(key);
  }

  async function placeOrder() {
    if (!selectedAddressId) {
      message.warning("Choose a delivery address");
      goTo("address");
      return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post<ApiEnvelope<Order>>("/orders", {
        addressId: selectedAddressId,
        paymentMethod: "cod",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      message.success("Order placed successfully");
      router.push(`/orders/success?id=${data.data._id}`);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setPlacing(false);
    }
  }

  async function deleteAddress(address: Address) {
    try {
      await api.delete(`/addresses/${address._id}`);
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      message.success("Address removed");
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  if (!ready || isLoading) {
    return (
      <div className="container-page" style={{ padding: "30px 24px 56px" }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const empty = cart.items.length === 0;

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">My cart</span>
        </div>
      </div>

      <div className="container-page">
        <div className="checkout-column">
          {empty ? (
            <div className="checkout-box">
              <div className="empty-state">
                <Empty description="Your bag is empty. Add a few classics to get started." />
                <Button type="primary" href="/" icon={<ShoppingOutlined />} style={{ marginTop: 16 }}>
                  Browse the catalogue
                </Button>
              </div>
            </div>
          ) : (
            <>
              <section className="checkout-box" aria-labelledby="my-cart-heading">
                <div className="checkout-head">
                  <h1 id="my-cart-heading" className="checkout-title">
                    My cart ({cart.summary.itemCount})
                  </h1>

                  <Dropdown
                    menu={{ items: locationItems, onClick: onLocationMenuClick }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <button type="button" className="checkout-location">
                      <EnvironmentOutlined />
                      <span className="checkout-location-text">
                        {selectedAddress ? selectedAddress.line1 : "Use current location"}
                      </span>
                      <DownOutlined className="checkout-location-caret" />
                    </button>
                  </Dropdown>
                </div>

                <div className="checkout-cart-lines">
                  {cart.items.map((item) => (
                    <div className="checkout-cart-line" key={item.bookId}>
                      <BookCover
                        src={item.coverImage}
                        title={item.title}
                        className="checkout-cart-thumb"
                      />
                      <div className="checkout-cart-info">
                        <Link href={`/books/${item.bookId}`}>
                          <h2 className="checkout-cart-title">{item.title}</h2>
                        </Link>
                        <p className="checkout-cart-author">by {item.author}</p>
                        <div className="checkout-cart-price">
                          <span className="price-now">{formatINR(item.price)}</span>
                          {item.originalPrice && item.originalPrice > item.price ? (
                            <span className="price-was">{formatINR(item.originalPrice)}</span>
                          ) : null}
                        </div>

                        <div className="checkout-cart-controls">
                          <div className="qty-stepper" aria-label={`Quantity of ${item.title}`}>
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => update(item.bookId, Math.max(1, item.quantity - 1))}
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={item.quantity >= Math.min(item.stock || 1, 10)}
                              onClick={() =>
                                update(item.bookId, Math.min(item.quantity + 1, item.stock || 1, 10))
                              }
                            >
                              +
                            </button>
                          </div>

                          <Popconfirm
                            title="Remove this title?"
                            description="You can always add it back from the catalogue."
                            okText="Remove"
                            cancelText="Keep"
                            onConfirm={() => remove(item.bookId)}
                          >
                            <button type="button" className="checkout-remove">
                              Remove
                            </button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="checkout-actions">
                  <Button
                    type="primary"
                    className="btn-xd-blue"
                    size="large"
                    onClick={() => goTo("address")}
                  >
                    Continue
                  </Button>
                </div>
              </section>

              <section className="checkout-box" aria-labelledby="address-details-heading">
                <button
                  type="button"
                  className="checkout-head checkout-head-button"
                  onClick={() => goTo("address")}
                  aria-expanded={addressExpanded}
                  aria-controls="address-details-body"
                >
                  <h2 id="address-details-heading" className="checkout-section-title">
                    Address Details
                  </h2>
                  {addressExpanded ? <UpOutlined /> : <DownOutlined />}
                </button>

                {addressExpanded ? (
                  <div className="checkout-section-body" id="address-details-body">
                    <div className="checkout-subhead">
                      <h3>Customer Details</h3>
                      <Button icon={<PlusOutlined />} onClick={() => openNewAddress()}>
                        Add New Address
                      </Button>
                    </div>

                    {addresses.isLoading ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : selectedAddress ? (
                      <div className="customer-details">
                        <div className="customer-field">
                          <span>Full Name</span>
                          <strong>{selectedAddress.fullName}</strong>
                        </div>
                        <div className="customer-field">
                          <span>Mobile number</span>
                          <strong>{selectedAddress.mobile}</strong>
                        </div>
                        <div className="customer-field wide">
                          <span>Address</span>
                          <strong>
                            {selectedAddress.line1}
                            {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}
                          </strong>
                        </div>
                        <div className="customer-field">
                          <span>City / town</span>
                          <strong>{selectedAddress.city}</strong>
                        </div>
                        <div className="customer-field">
                          <span>State</span>
                          <strong>{selectedAddress.state}</strong>
                        </div>
                        <div className="customer-field">
                          <span>Type</span>
                          <strong>{titleCase(selectedAddress.label)}</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="checkout-hint">Add a delivery address to continue.</p>
                    )}

                    {addressList.length > 0 ? (
                      <div className="checkout-address-list">
                        {addressList.map((address) => (
                          <div
                            key={address._id}
                            className={`checkout-address-row ${
                              selectedAddressId === address._id ? "selected" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="checkout-address-select"
                              onClick={() => setPickedAddressId(address._id)}
                              aria-pressed={selectedAddressId === address._id}
                            >
                              <span className="address-label">
                                {titleCase(address.label)}
                                {address.isDefault ? " · Default" : ""}
                              </span>
                              <strong>{address.fullName}</strong>
                              <span className="checkout-address-text">
                                {address.line1}
                                {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                                {address.state} {address.pincode}
                              </span>
                            </button>
                            <div className="checkout-address-actions">
                              <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingAddress(address);
                                  setAddressOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this address?"
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => void deleteAddress(address)}
                              >
                                <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="checkout-actions">
                      <Button
                        type="primary"
                        className="btn-xd-blue"
                        size="large"
                        disabled={!selectedAddressId}
                        onClick={() => goTo("summary")}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="checkout-box" aria-labelledby="order-summary-heading">
                <button
                  type="button"
                  className="checkout-head checkout-head-button"
                  onClick={() => goTo(summaryExpanded ? "address" : "summary")}
                  aria-expanded={summaryExpanded}
                  aria-controls="order-summary-body"
                >
                  <h2 id="order-summary-heading" className="checkout-section-title">
                    Order summary
                  </h2>
                  {summaryExpanded ? <UpOutlined /> : <DownOutlined />}
                </button>

                {summaryExpanded ? (
                  <div className="checkout-section-body" id="order-summary-body">
                    <div className="checkout-summary-lines">
                      {cart.items.map((item) => (
                        <div className="checkout-summary-line" key={item.bookId}>
                          <BookCover
                            src={item.coverImage}
                            title={item.title}
                            className="checkout-cart-thumb"
                          />
                          <div className="checkout-cart-info">
                            <span className="checkout-cart-title">{item.title}</span>
                            <p className="checkout-cart-author">by {item.author}</p>
                            <div className="checkout-cart-price">
                              <span className="price-now">{formatINR(item.price)}</span>
                              {item.originalPrice && item.originalPrice > item.price ? (
                                <span className="price-was">{formatINR(item.originalPrice)}</span>
                              ) : null}
                            </div>
                          </div>
                          <span className="checkout-summary-qty">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="checkout-totals">
                      <div className="summary-row">
                        <span>Items ({cart.summary.itemCount})</span>
                        <span>{formatINR(cart.summary.subtotal)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Delivery</span>
                        <span>
                          {cart.summary.shippingFee === 0
                            ? "Free"
                            : formatINR(cart.summary.shippingFee)}
                        </span>
                      </div>
                      <div className="summary-row total">
                        <span>Total</span>
                        <span>{formatINR(cart.summary.total)}</span>
                      </div>
                    </div>

                    <div className="checkout-actions">
                      <Popconfirm
                        title="Place order?"
                        description={`Pay ${formatINR(cart.summary.total)} on delivery.`}
                        okText="Place order"
                        cancelText="Cancel"
                        onConfirm={() => void placeOrder()}
                      >
                        <Button
                          type="primary"
                          className="btn-xd-blue"
                          size="large"
                          loading={placing}
                        >
                          Checkout
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>

      <AddressFormModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        address={editingAddress}
        prefill={addressDraft ?? undefined}
        onSaved={(saved) => setPickedAddressId(saved._id)}
      />
    </>
  );
}






