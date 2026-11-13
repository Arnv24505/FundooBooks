"use client";

import Link from "next/link";
import { StarFilled } from "@ant-design/icons";
import BookCover from "@/components/books/BookCover";
import { formatINR } from "@/lib/money";
import { formatAuthorName } from "@/lib/format";
import type { Book } from "@/types";

export default function BookCard({
  book,
  onQuickView,
  priority = false,
}: {
  book: Book;
  onQuickView?: (book: Book) => void;
  priority?: boolean;
}) {
  const outOfStock = (book.stock ?? 0) <= 0;
  const author = formatAuthorName(book.authors?.[0]?.name);
  const rating = Number(book.rating ?? 0);
  const reviewCount = book.reviewCount ?? 0;
  const hasStruckPrice =
    book.originalPrice !== undefined &&
    book.originalPrice !== null &&
    book.price !== undefined &&
    book.price !== null &&
    book.originalPrice > book.price;

  return (
    <article className="book-card">
      <Link href={`/books/${book._id}`} className="book-cover-wrap">
        <BookCover src={book.coverImage} title={book.title} priority={priority} />

        {onQuickView ? (
          <span
            className="quick-view"
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.preventDefault();
              onQuickView(book);
            }}
          >
            Quick view
          </span>
        ) : null}

        {outOfStock ? <span className="out-of-stock-overlay">out of stock</span> : null}
      </Link>

      <div className="book-card-body">
        <Link href={`/books/${book._id}`}>
          <h2 className="book-card-title">{book.title}</h2>
        </Link>
        <p className="book-card-author">by {author}</p>

        <div className="book-card-rating">
          <span className="rating-badge">
            {rating.toFixed(1)}
            <StarFilled className="star" />
          </span>
          <span>({reviewCount})</span>
        </div>

        <div className="book-card-price">
          <span className="price-now">{formatINR(book.price)}</span>
          {hasStruckPrice ? (
            <span className="price-was">{formatINR(book.originalPrice)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}



