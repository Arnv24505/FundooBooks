"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Empty, Select, Skeleton } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import BookCard from "@/components/books/BookCard";
import QuickViewModal from "@/components/books/QuickViewModal";
import NotifyMeModal from "@/components/books/NotifyMeModal";
import { fetchBooksPage, useBooks } from "@/hooks/queries";
import type { CatalogFilters } from "@/hooks/queries";
import type { Book } from "@/types";

const PAGE_SIZE = 12;

const SORT_LABELS: Record<string, string> = {
  popular: "Popularity",
  price_asc: "Price : Low to High ",
  price_desc: "Price : High to Low ",
  newest: "Newest Arrivals",
  rating: "Top rated",
};

type PageItem = number | "ellipsis";

function paginationItems(current: number, total: number): PageItem[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  if (current <= 5) {
    return [1, 2, 3, 4, 5, 6, 7, "ellipsis", total];
  }
  if (current >= total - 4) {
    const start = total - 6;
    return [1, "ellipsis", ...Array.from({ length: 7 }, (_, index) => start + index)];
  }
  return [
    1,
    "ellipsis",
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
    "ellipsis",
    total,
  ];
}

export default function CatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const searchKey = searchParams.toString();

  const filters: CatalogFilters = useMemo(() => {
    const params = new URLSearchParams(searchKey);
    return {
      search: params.get("search") || undefined,
      category: params.get("category") || undefined,
      sort: params.get("sort") || "popular",
    };
  }, [searchKey]);

  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const query = useBooks(filters, page, PAGE_SIZE);

  const books = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const [quickView, setQuickView] = useState<Book | null>(null);
  const [notifyBook, setNotifyBook] = useState<Book | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Prefetch the next page when the sentinel comes into view so numbered page
  // jumps feel instant without streaming the whole catalogue into the DOM.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !pagination?.hasNextPage) return;
    const nextPage = page + 1;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void queryClient.prefetchQuery({
          queryKey: ["books", filters, nextPage, PAGE_SIZE],
          queryFn: () => fetchBooksPage(filters, nextPage, PAGE_SIZE),
          staleTime: 60_000,
        });
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filters, page, pagination?.hasNextPage, queryClient]);

  function navigate(params: URLSearchParams, scrollToTop = false) {
    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSort(sort: string | undefined) {
    const next = new URLSearchParams(searchKey);
    next.delete("page");
    if (!sort || sort === "popular") next.delete("sort");
    else next.set("sort", sort);
    navigate(next);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    const next = new URLSearchParams(searchKey);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    navigate(next, true);
  }

  function clearFilters() {
    navigate(new URLSearchParams());
  }

  const pageItems = paginationItems(page, totalPages);

  return (
    <>
      <div className="container-page catalog-page">
        <div className="catalog-heading">
          <div>
            <h1 className="catalog-title">
              {filters.search ? `Results for “${filters.search}”` : filters.category ? filters.category : "Books"}
            </h1>
          </div>

          <div className="catalog-tools">
            <Select
              className="sort-select"
              variant="borderless"
              value={filters.sort}
              onChange={updateSort}
              options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
              aria-label="Sort books"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="catalog-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="book-card book-card-skeleton">
                <Skeleton.Image active className="skeleton-cover" />
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <Empty
              description={
                filters.search
                  ? `No books match “${filters.search}”. Try a different search.`
                  : "No books found."
              }
            />
            <Button onClick={clearFilters} style={{ marginTop: 12 }}>
              Clear search
            </Button>
          </div>
        ) : (
          <>
            <div className="catalog-grid">
              {books.map((book, index) => (
                <BookCard
                  key={book._id}
                  book={book}
                  priority={index < PAGE_SIZE}
                  onQuickView={setQuickView}
                />
              ))}
            </div>

            <div ref={sentinelRef} aria-hidden />

            {totalPages > 1 ? (
              <nav className="pagination" aria-label="Catalogue pages">
                <button
                  type="button"
                  className="page-btn prev"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <LeftOutlined />
                </button>

                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span className="page-ellipsis" key={`gap-${index}`}>
                      ...
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      className={`page-btn ${item === page ? "active" : ""}`}
                      aria-current={item === page ? "page" : undefined}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="page-btn next"
                  aria-label="Next page"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <RightOutlined />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>

      <QuickViewModal book={quickView} open={Boolean(quickView)} onClose={() => setQuickView(null)} />
      <NotifyMeModal book={notifyBook} open={Boolean(notifyBook)} onClose={() => setNotifyBook(null)} />
    </>
  );
}

