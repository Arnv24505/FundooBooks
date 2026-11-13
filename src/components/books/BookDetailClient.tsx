"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Empty, Form, Input, Rate, Skeleton } from "antd";
import {
  HeartFilled,
  HeartOutlined,
  ShoppingOutlined,
  StarFilled,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BookCover from "@/components/books/BookCover";
import NotifyMeModal from "@/components/books/NotifyMeModal";
import { api, getApiErrorMessage } from "@/lib/apiClient";
import { formatINR } from "@/lib/money";
import { formatAuthorName } from "@/lib/format";
import { useBook, useToggleWishlist, useWishlist } from "@/hooks/queries";
import { useCart } from "@/hooks/useCart";
import { useAppSelector } from "@/store/hooks";
import type { Review } from "@/types";

type ReviewFormValues = {
  rating: number;
  comment?: string;
};

export default function BookDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const user = useAppSelector((state) => state.auth.user);
  const detail = useBook(id);
  const wishlist = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const { add, cart, update, remove } = useCart();

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [reviewForm] = Form.useForm<ReviewFormValues>();

  const reviewMutation = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      await api.post(`/books/${id}/reviews`, values);
    },
    onSuccess: async () => {
      message.success("Thank you — your review has been saved.");
      reviewForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["book", id] });
      await queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  if (detail.isLoading) {
    return (
      <div className="container-page detail-wrap">
        <div className="detail-grid">
          <Skeleton.Image active style={{ width: 361, height: 413 }} />
          <div>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const book = detail.data?.data;
  if (!book) {
    return (
      <div className="container-page detail-wrap">
        <div className="empty-state">
          <Empty description="This book could not be found." />
          <Button type="primary" href="/" style={{ marginTop: 16 }}>
            Back to the catalogue
          </Button>
        </div>
      </div>
    );
  }

  const currentBook = book;
  const reviews: Review[] = detail.data?.reviews?.data ?? [];
  const reviewSummary = detail.data?.reviews?.summary;
  // When no customer reviews exist yet, fall back to the catalogue rating so the
  // detail page matches the rating badge shown on the book card.
  const summary =
    reviewSummary && reviewSummary.count > 0
      ? reviewSummary
      : { average: currentBook.rating ?? 0, count: currentBook.reviewCount ?? 0 };
  const wishlisted = (wishlist.data?.ids ?? []).includes(currentBook._id);
  const outOfStock = (currentBook.stock ?? 0) <= 0;
  const author = formatAuthorName(currentBook.authors?.[0]?.name);
  const cartItem = cart.items.find((item) => item.bookId === currentBook._id);
  const hasStruckPrice =
    currentBook.originalPrice !== undefined &&
    currentBook.price !== undefined &&
    currentBook.originalPrice > currentBook.price;

  function onToggleWishlist(selected?: { _id: string }) {
    const target = selected ?? currentBook;
    if (!user) {
      message.info("Login to save books to your wishlist");
      router.push(`/login?next=/books/${target._id}`);
      return;
    }
    const isSaved = (wishlist.data?.ids ?? []).includes(target._id);
    toggleWishlist.mutate(
      { bookId: target._id, add: !isSaved },
      {
        onSuccess: () => message.success(isSaved ? "Removed from wishlist" : "Added to wishlist"),
        onError: () => message.error("Could not update your wishlist"),
      }
    );
  }

  async function submitReview(values: ReviewFormValues) {
    if (!user) {
      message.info("Login to write a review");
      router.push(`/login?next=/books/${currentBook._id}`);
      return;
    }
    await reviewMutation.mutateAsync(values);
  }

  function changeQuantity(next: number) {
    if (!cartItem) return;
    if (next <= 0) {
      remove(cartItem.bookId);
      return;
    }
    update(cartItem.bookId, Math.min(next, Math.max(currentBook.stock ?? 1, 1)));
  }

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{currentBook.title}</span>
        </div>
      </div>

      <div className="container-page detail-wrap">
        <div className="detail-grid">
          <div className="detail-cover-panel">
            <div className="detail-cover-frame">
              <BookCover
                src={currentBook.coverImage}
                title={currentBook.title}
                className="detail-cover"
                priority
              />
              {outOfStock ? <span className="out-of-stock-overlay">out of stock</span> : null}
            </div>

            <div className="detail-buy-row">
              {outOfStock ? (
                <button
                  type="button"
                  className="detail-buy"
                  onClick={() => setNotifyOpen(true)}
                >
                  Notify me
                </button>
              ) : cartItem ? (
                <div className="detail-qty" aria-label="Quantity in bag">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => changeQuantity(cartItem.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{cartItem.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={cartItem.quantity >= (currentBook.stock ?? 1)}
                    onClick={() => changeQuantity(cartItem.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="detail-buy"
                  disabled={!currentBook.price}
                  onClick={() => void add(currentBook, 1)}
                >
                  <ShoppingOutlined /> Add to bag
                </button>
              )}

              <button
                type="button"
                className="detail-wish"
                onClick={() => onToggleWishlist()}
              >
                {wishlisted ? <HeartFilled /> : <HeartOutlined />}
                Wishlist
              </button>
            </div>
          </div>

          <div className="detail-main">
            <h1 className="detail-title">{currentBook.title}</h1>
            <p className="detail-author">by {author}</p>

            <div className="detail-rating">
              <span className="rating-badge">
                {Number(summary.average).toFixed(1)}
                <StarFilled className="star" />
              </span>
              <span className="count">({summary.count})</span>
            </div>

            <div className="detail-price">
              <span className="price-now">{formatINR(currentBook.price)}</span>
              {hasStruckPrice ? (
                <span className="price-was">{formatINR(currentBook.originalPrice)}</span>
              ) : null}
            </div>

            <div className="detail-divider" />

            <h2 className="detail-subhead">
              <span className="detail-bullet" aria-hidden />
              Book Detail
            </h2>
            <p className="detail-description">
              {currentBook.description ||
                `${currentBook.title} by ${author}. This Project Gutenberg edition is available in the bookstore catalogue.`}
            </p>

            <section className="detail-feedback" aria-labelledby="feedback-heading">
              <h2 id="feedback-heading" className="feedback-title">
                Customer Feedback
              </h2>

              <div className="feedback-box">
                <span className="feedback-label">Overall rating</span>
                <div className="feedback-stars" aria-hidden>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarFilled
                      key={star}
                      style={{ color: star <= Math.round(summary.average) ? "#FFCE00" : "#D9D9D9" }}
                    />
                  ))}
                </div>

                <Form
                  form={reviewForm}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={submitReview}
                  disabled={!user}
                  initialValues={{ rating: 5 }}
                  className="feedback-form"
                >
                  <Form.Item
                    name="rating"
                    rules={[{ required: true, message: "Choose a rating" }]}
                    className="feedback-rating-item"
                  >
                    <Rate />
                  </Form.Item>
                  <Form.Item name="comment" className="feedback-comment-item">
                    <Input.TextArea
                      className="feedback-textarea"
                      placeholder="Write your review"
                      maxLength={2000}
                      autoSize={{ minRows: 3, maxRows: 3 }}
                    />
                  </Form.Item>
                  <div className="feedback-actions">
                    <button
                      type="submit"
                      className="feedback-submit"
                      disabled={!user || reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? "Saving…" : "Submit"}
                    </button>
                  </div>
                  {!user ? (
                    <p className="feedback-signin">
                      <Link href={`/login?next=/books/${currentBook._id}`}>Login</Link> to write a
                      review.
                    </p>
                  ) : null}
                </Form>
              </div>

              <div className="review-list">
                {reviews.length === 0 ? (
                  <p className="review-empty">No customer reviews yet. Be the first to review this title.</p>
                ) : (
                  reviews.map((review) => (
                    <article className="review-row" key={review._id}>
                      <div className="review-avatar" aria-hidden>
                        {review.userName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="review-body">
                        <strong>{review.userName}</strong>
                        <Rate disabled value={review.rating} className="review-stars" />
                        {review.comment ? <p className="review-comment">{review.comment}</p> : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <NotifyMeModal book={book} open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </>
  );
}



