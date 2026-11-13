import { Suspense } from "react";
import type { Metadata } from "next";
import CatalogClient from "@/components/catalog/CatalogClient";

export const metadata: Metadata = {
  title: "Books — 1,000 Project Gutenberg classics",
  description:
    "Browse 1,000 Project Gutenberg classics with cash on delivery across India. Search and sort the full catalogue.",
};

function CatalogFallback() {
  return (
    <div className="container-page catalog-page">
      <div className="catalog-heading">
        <h1 className="catalog-title">Books</h1>
        <div className="catalog-tools">
          <span className="sort-select skeleton-sort" />
        </div>
      </div>
      <div className="catalog-grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="book-card book-card-skeleton">
            <span className="skeleton-cover" />
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogClient />
    </Suspense>
  );
}
