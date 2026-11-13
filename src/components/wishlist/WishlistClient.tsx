"use client";

import Link from "next/link";
import { App, Button, Empty, Skeleton } from "antd";
import { DeleteOutlined, HeartOutlined, LoginOutlined } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import { formatINR } from "@/lib/money";
import { formatAuthorName } from "@/lib/format";
import { useToggleWishlist, useWishlist } from "@/hooks/queries";
import { useAppSelector } from "@/store/hooks";
import type { Book } from "@/types";

export default function WishlistClient() {
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const wishlist = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const { message } = App.useApp();

  const books = wishlist.data?.books ?? [];

  function remove(book: Book) {
    toggleWishlist.mutate(
      { bookId: book._id, add: false },
      {
        onSuccess: () => message.success("Removed from wishlist"),
        onError: () => message.error("Could not update your wishlist"),
      }
    );
  }

  return (
    <>
      <div className="breadcrumb-bar">
        <div className="container-page breadcrumb-inner">
          <Link href="/">Home /</Link>
          <span className="breadcrumb-current">My Wishlist</span>
        </div>
      </div>

      <div className="container-account account-page">
        <div className="account-shell">
          <div className="account-head">
            <h1 className="account-title">
              My Wishlist{user && wishlist.data ? ` (${books.length})` : ""}
            </h1>
          </div>

          {!ready || (user && wishlist.isLoading) ? (
            <div className="account-loading">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : !user ? (
            <div className="account-empty">
              <div className="account-empty-mark">
                <HeartOutlined />
              </div>
              <h2>Please log in</h2>
              <p>Login to view items in your wishlist.</p>
              <Button type="primary" href="/login?next=/wishlist" icon={<LoginOutlined />}>
                Login / Signup
              </Button>
            </div>
          ) : books.length === 0 ? (
            <div className="account-empty">
              <Empty description="Your wishlist is empty. Tap the heart on a book to save it." />
              <Button type="primary" href="/" style={{ marginTop: 16 }}>
                Browse books
              </Button>
            </div>
          ) : (
            <div className="wl-list">
              {books.map((book) => (
                <article className="wl-row" key={book._id}>
                  <Link href={`/books/${book._id}`} className="wl-cover-link">
                    <BookCover src={book.coverImage} title={book.title} className="wl-cover" />
                  </Link>

                  <div className="wl-body">
                    <Link href={`/books/${book._id}`} className="wl-title">
                      {book.title}
                    </Link>
                    <p className="wl-author">by {formatAuthorName(book.authors?.[0]?.name)}</p>
                    <div className="wl-price">
                      <span className="price-now">{formatINR(book.price)}</span>
                      {book.originalPrice !== undefined &&
                      book.price !== undefined &&
                      book.originalPrice > book.price ? (
                        <span className="price-was">{formatINR(book.originalPrice)}</span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="wl-remove"
                    aria-label={`Remove ${book.title} from wishlist`}
                    onClick={() => remove(book)}
                  >
                    <DeleteOutlined />
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


