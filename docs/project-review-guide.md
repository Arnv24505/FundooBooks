# Fundoo Books — Project Review Guide (In-Depth)

This guide is written for a **student project review**. It explains what the project does, how it is built, why each major technology/design choice was made, and how to answer common technical questions with **plausible, accurate explanations** grounded in this codebase.

> Scope note: answers describe the **implemented** system in `bookstore/` (Next.js App Router + MongoDB Atlas + Ant Design). Where behavior depends on environment (SMTP, Google OAuth credentials, deployment), that is called out explicitly.

---

## 1. One-Minute Project Summary

**Fundoo Books** is a full-stack bookstore web application. It imports **1,000 Project Gutenberg books** from the **Gutendex** metadata API and presents them as a browsable catalogue. Users can browse/search/filter books, view details, sign up or log in (email/password or Google OAuth), manage a wishlist and cart, save addresses, place **cash-on-delivery (COD)** orders, and track order history. Administrators get a protected admin console for dashboard stats, catalogue CRUD, orders, and customer/role management.

**Key technical idea:** keep the system honest about data provenance — Gutendex provides metadata but not real prices/stock/ratings, so the app generates **deterministic demo storefront fields** and marks them with `isDemoData: true`.

---

## 2. Tech Stack — What and Why

| Area | Technology | What it does here | Why this choice (review answer) |
|---|---|---|---|
| Framework | **Next.js 16.4.5 (App Router)** | Pages, layouts, server/client components, Route Handlers (`app/api/**/route.ts`), `proxy.ts` optimistic guards | Full-stack React framework: UI and HTTP API in one project; file-based routing; good production deployment story (e.g., Vercel). App Router supports modern React patterns and explicit server boundaries. |
| UI runtime | **React 19.3**, **TypeScript** | Component model, type safety | React is standard for component UI; TypeScript catches shape/errors early and documents contracts (API envelopes, models, props). |
| UI library | **Ant Design 6** | Forms, tables, modals, buttons, inputs, messages, layout primitives | Speeds up accessible, consistent UI (especially admin/forms) while custom `globals.css` handles XD-specific visual fidelity. |
| Styling | **Tailwind CSS 4** + global CSS design system (`globals.css`) | Utility classes available; most XD design tokens/layout live in global CSS variables/rules | Tailwind helps rapid spacing/layout tweaks; a tokenized global stylesheet is practical for pixel/design alignment, responsive header/navbar behavior, and theme overrides. |
| Client state | **Redux Toolkit** | Auth session user + **guest cart** (hydrated from `localStorage`) | Guest cart must work before login and persist locally; Redux gives predictable updates and a single store for cross-cutting UI state. |
| Server/cache state | **TanStack Query (React Query)** | Catalogue, cart, wishlist, orders, admin data; caching, invalidation, prefetch | Server state has lifecycle concerns (loading/error/stale/refetch). React Query handles caching, retries, query keys, invalidation after mutations, and prefetching better than manual `useEffect` fetching. |
| HTTP client | **Axios** (`/api`, `withCredentials`) | Typed requests, centralized error parsing | Cookies must be sent (`withCredentials`); Axios interceptors/config and a shared `getApiErrorMessage/getFieldErrors` simplify consistent error handling. |
| Database | **MongoDB Atlas** + **Mongoose 9** | Persistent data, schemas/indexes, queries | Document model fits books, embedded author arrays, order snapshots, and flexible catalogue metadata. Atlas provides managed hosting usable in dev and production. Mongoose adds schema validation, models, and connection management. |
| Auth | **JWT (`jose`) in HTTP-only cookie** + **bcryptjs** | Session token, password hashing | Cookie-based session avoids storing tokens in JS-accessible storage; `httpOnly` reduces XSS token theft risk. bcrypt hashes passwords (slow/adaptive) so raw passwords aren’t stored. |
| Validation | **Zod** | Request/query/body validation | Never trust client input. Zod validates at the API boundary and produces field-level errors that map cleanly to forms. |
| Email | **Nodemailer** + `EmailJob` model + `after()` | Transactional emails (welcome, reset, order, stock alerts) | Real email delivery is environment-dependent. Queueing/recording jobs and sending after response keeps UX responsive and allows graceful local behavior when SMTP is missing. |
| API docs | **OpenAPI** (`/api/openapi`) + **Swagger UI** (`/docs`) | Discoverable HTTP contract | Makes the Route Handler API inspectable/testable and documents request/response expectations. |
| Testing/quality | **Vitest**, **ESLint**, **TypeScript `tsc --noEmit`**, Lighthouse script | Unit tests and static checks | Fast feedback on logic (money, demo data, validators), lint/type correctness, and performance/accessibility audits. |

### Why not X? (plausible answers)
- **Why not only Server Actions?** Route Handlers provide an explicit HTTP API surface, easy to document with OpenAPI, and reusable by any client. (The project deliberately chose Route Handlers.)
- **Why not store JWT in `localStorage`?** `localStorage` is readable by JavaScript; an XSS bug could exfiltrate tokens. An `httpOnly`, `sameSite=lax` cookie is not readable by JS and is sent automatically by the browser.
- **Why not SQL for this project?** The data (book metadata, variable author/subject arrays, snapshots) maps naturally to documents; rapid iteration and Atlas deployment were practical. (A relational design could also work with normalization — tradeoff answer.)
- **Why not keep guest cart only on server?** Guests haven’t authenticated yet; requiring an account before adding to cart hurts UX. Local Redux + `localStorage`, then merge on login, balances friction and persistence.

---

## 3. High-Level Architecture

### Three tiers
1. **Client (browser):** Next.js App Router pages/components. Redux holds auth/guest cart; TanStack Query fetches/caches server data via Axios `/api`.
2. **Server (Next.js):** Route Handlers validate input (Zod), enforce host/rate-limit/auth/role checks as needed, call services, and return JSON envelopes. `src/proxy.ts` performs **optimistic page redirects** only.
3. **Data (MongoDB Atlas):** Mongoose models/collections persist users, books, carts, wishlists, addresses, orders, reviews, and helper workflow collections.

### Request flow (typical)
`UI event → TanStack Query mutation/query or Redux action → Axios /api → Route Handler → Zod validation → auth/host/rate-limit → service → Mongoose → MongoDB → JSON response → cache invalidation/UI update`.

### Why this layering?
- **Thin handlers:** easier to read and keep HTTP concerns at the edge.
- **Services:** business rules (checkout totals, stock changes, order creation, merge logic) live in one place and can be tested/reused.
- **Validators/models:** enforce shape before data reaches business logic or DB.

---

## 4. Project Structure (mental map)

```text
bookstore/src/
  app/            App Router pages/layouts + Route Handlers (api/*/route.ts)
  components/     UI: layout, catalog, books, auth, checkout, orders, admin, profile
  hooks/          TanStack Query hooks, cart hooks, admin hooks
  lib/            db, auth, env, security, money, mailer, api client/errors, openapi, logger
  models/         Mongoose schemas/models
  services/       Business logic (auth, books, cart, orders, wishlist, admin, stock alerts)
  store/          Redux Toolkit store/slices/actions (auth + guest cart)
  types/          Shared TypeScript types
  validators/     Zod schemas
  scripts/        Import/refresh/make-admin scripts (src/scripts)
docs/             architecture, build-log, review-log, rationale, this guide
```

**Review tip:** if asked “where would you change X?”, answer by layer: validation in `validators/`, rule in `services/`, HTTP in `app/api`, UI in `components`, money formatting in `lib/money`.

---

## 5. Data Model and Collections

### Core collections
| Collection/model | Purpose | Important design choice |
|---|---|---|
| `books` | Catalogue: Gutendex metadata + storefront fields | `sourceId` unique for idempotent import; `isDemoData` flags generated commerce fields. |
| `users` | Accounts (local/Google), role, `tokenVersion`, profile data | `tokenVersion` invalidates old JWTs after sensitive changes. |
| `carts` | Server-side cart per signed-in user | Stores snapshots/refs needed for checkout; merged with guest cart after login. |
| `wishlists` | Saved book IDs per user | Lightweight relation; UI adds/removes items. |
| `addresses` | Saved Indian delivery addresses | Supports checkout address selection/CRUD; default address behavior. |
| `orders` | Placed orders | **Immutable snapshots** (items, prices including original price context, address, totals, status history) so later catalogue edits don’t rewrite history. |
| `reviews` | User reviews per book | One review per user/book (upsert pattern) to avoid duplicate reviews. |

### Helper collections (important in reviews)

| Collection | What it stores | Why it exists (simple but technical) | Security/ops notes |
|---|---|---|---|
| `emailjobs` | Email jobs: to, subject, template, payload, status (`queued/sent/skipped/failed`), attempts, error, timestamps | Transactional email is sent after the response (`after()`) so requests aren’t blocked. DB gives a durable record/receipt and supports “skip when SMTP missing” behavior. | `payload`/errors may contain PII/operational detail; protect DB access; don’t expose raw jobs publicly; consider retention. |
| `passwordresettokens` | `userId`, `tokenHash` (not raw token), `expiresAt` (TTL), `usedAt` | Reset is verified in a *later* request. Hash + `usedAt` + expiry make the link time-limited and single-use. TTL auto-cleans expired rows. | Safer than storing raw tokens. **Why not JWT-only with `exp`?** Stateless JWTs are hard to make single-use/revocable without server state; DB state gives replay/revocation control. |
| `stockalerts` | `bookId`, `email`, optional `userId`, `notifiedAt` (unique per book+email) | “Notify me” must persist while out of stock. On restock, app notifies and marks `notifiedAt`. | Contains email (PII) and interest data; protect DB; validate/rate-limit creation; consider retention. |

### Indexes/examples worth mentioning
- `books.sourceId` unique — idempotent Gutendex upsert, stable 1,000-book target.
- Search/support fields indexed (e.g., title/authors/subjects/isbn patterns as used).
- `users.email` unique; `users.googleId` sparse unique (only present for linked Google accounts).
- `users.role` for admin-oriented queries/guards context.
- TTL index on password reset `expiresAt` for automatic expiry cleanup.

---

## 6. Gutendex Import and Demo Data

### What Gutendex provides
Gutendex exposes **Project Gutenberg metadata** (titles, authors, subjects, languages, download counts, formats/covers etc.), **not** e-commerce fields like selling price, MRP, inventory stock, or trustworthy storefront ratings.

### How this project handles it
- `npm run import:books` fetches pages, normalizes author names (`"Last, First"` → `"First Last"` where applicable), deduplicates, and upserts into MongoDB by `sourceId`.
- Storefront fields are computed **deterministically** from `sourceId` (e.g., `demoPriceFor`, `demoOriginalPriceFor`, `demoStockFor`, `demoRatingFor` in `src/lib/money.ts`) and stored with `isDemoData: true`.
- `npm run refresh:books` recomputes derived fields without re-calling Gutendex.

### Why deterministic?
Deterministic generation is reproducible: the same book gets the same demo price/stock/rating across runs/environments (until intentionally refreshed). Random values would make testing, demos, and debugging inconsistent.

### Review answer: “Is the price real?”
“No. Gutendex doesn’t provide prices. The app generates stable demo pricing/stock/rating from the Gutenberg `sourceId` and marks records as `isDemoData: true` so it’s transparent. In a real store, admins or a pricing service would supply authoritative values.”

---

## 7. Money, Currency, and Checkout Rules

### Single source of truth: `src/lib/money.ts`
- Money is handled as **whole Indian Rupees**.
- `formatINR` uses `Intl.NumberFormat("en-IN")` (Indian digit grouping), returns `₹…` or `—` for null/NaN.
- Constants: `FREE_SHIPPING_THRESHOLD = 499`, `STANDARD_SHIPPING_FEE = 49`.
- `computeSummary(items)` returns item count, subtotal, shipping, total.

### Why centralize money logic?
- Prevents UI drift (one component showing ₹499 rule, another ₹500).
- Makes tests easy (validators/money behavior covered by Vitest).
- Ensures shipping and totals are computed consistently.

### Critical checkout/security rule
**The client never decides the final payable amount.** The server recomputes totals from authoritative book/cart data, validates price/availability, and creates immutable order snapshots. This prevents tampering (e.g., user modifying request payload to pay less).

### Stock safety
Order placement uses atomic stock updates (`stock >= quantity` checks) and rollback of earlier decrements on multi-item failures to avoid overselling/partial inconsistencies.

---

## 8. Authentication Deep Dive

### Local auth
- Register/login/logout, profile, change password, forgot/reset password.
- Passwords are hashed with **bcrypt** (not stored in plaintext).
- Validation is performed with Zod; errors can be field-mapped to forms.

### Session design
- On successful auth, server signs a JWT (`jose`, `HS256`) containing claims like `sub` (user id), `role`, and `tv` (`tokenVersion`).
- Token is stored in cookie `bookstore_session`: **`httpOnly`**, **`sameSite=lax`**, `secure` in production, path `/`, expiry aligned with config.
- `getCurrentUser()` verifies signature, loads the user from DB, and checks `tokenVersion`. `requireUser()`/`requireAdmin()` enforce access.

### Why `httpOnly` + cookie?
- JS cannot read `httpOnly` cookies, reducing risk from XSS token theft.
- Browser sends cookies automatically (with `withCredentials` on Axios), simplifying authenticated requests.
- `sameSite=lax` helps mitigate CSRF in common navigation/form contexts; mutating handlers also use same-host/origin checks (`assertSameHost`) as defense in depth.

### Why `tokenVersion` (`tv`)?
It enables **server-side invalidation**. If a user changes/resets password (or an admin-sensitive role change requires revocation), incrementing `tokenVersion` means previously issued JWTs no longer match the DB and become invalid. This solves a common stateless-JWT problem: you can’t “unsign” a token already issued, but you can reject it on verification.

### Google OAuth
- Authorization-code flow with state cookie and server-side exchange/callback.
- Creates/links account as implemented and sets the same session cookie model.
- Requires configured client ID/secret and correct redirect URI; without config, UI should report it’s not configured.

### Password reset (why DB, not JWT-only)
- The emailed link is used later; server must verify it.
- DB stores **`tokenHash`** (not raw token), has `expiresAt` (TTL cleanup) and `usedAt` (single-use).
- JWT-only with `exp` handles time but not clean **single-use/revocation** without server state. This project chooses explicit server state for replay protection.

---

## 9. Authorization and Security Model

### Principle
**Never trust the client or UI for authorization.** Hiding an admin button is UX, not security.

### Layers
1. **`src/proxy.ts` (optimistic UX):** redirects guests from protected pages (e.g., `/profile`, `/orders`, `/admin`) and redirects authenticated users away from `/login`/`/signup` to a safe `next` path. It may check role for admin pages at the edge for UX. **This is not the security boundary.**
2. **Route Handlers:** every protected/admin API verifies session (`getCurrentUser`/`requireAdmin`) and applies checks (host/rate limit/ownership/role) as appropriate.
3. **Services/DB constraints:** ownership filters, unique indexes, atomic updates, and business invariants.

### Same-host / origin checks
Mutating endpoints can enforce `assertSameHost` (with `x-forwarded-host` handling for proxy/local cases). Logout was hardened to still clear the session cookie even if host checks fail in edge cases — sign-out must be reliable.

### Rate limiting
Fixed-window in-memory rate limiting is used for abuse-prone flows (e.g., auth endpoints). **Tradeoff:** per-process memory isn’t shared across instances; production scale-out should use a shared store (Redis/Upstash) — a good review point.

### Caching safety
Public catalogue data may use cache headers (`s-maxage`, `stale-while-revalidate`). Authenticated/personal data should use `no-store` and `Vary: Cookie` patterns to avoid leaking user-specific responses.

### Admin safeguards
- Admin routes check role server-side.
- Admin UI layout uses `robots: noindex, follow`.
- Role changes reject self-demotion and demoting the last admin; `tokenVersion` bump invalidates stale sessions.

---

## 10. Frontend Architecture

### App Router composition
- `src/app/layout.tsx` sets global HTML/body, metadata, and wraps the app in `Providers` + `AppShell`.
- `Providers` (`src/app/providers.tsx`, client) wires **AntD Registry/ConfigProvider**, **Redux Provider**, **TanStack QueryClientProvider**, and `AuthBootstrap`.
- `AppShell` renders `SiteHeader` + `main` + `SiteFooter` for normal pages; hides them for bare auth routes and `/admin` (admin uses its own shell).

### `AuthBootstrap`
On mount, it hydrates guest cart from `localStorage`, calls `/api/auth/me` to restore session, sets Redux auth state (`user`/`ready`), and if a user is present merges any guest cart items into the server cart then clears the guest cart. This is the key bridge between guest and authenticated shopping.

### Server vs client components (practical)
- Use client components where hooks/browser APIs/state/query are needed (catalog interactions, cart, auth forms, admin tables).
- Wrap `useSearchParams`-dependent catalogue UI in `Suspense` as required by Next App Router patterns.
- Dynamic route params in Next 16 are treated as `Promise` in server components/pages (e.g., `params: Promise<{ id: string }>`).

### Data fetching pattern
TanStack Query keys represent resources (`books`, `book`, `cart`, `wishlist`, `orders`, `admin/*`). Mutations invalidate relevant keys so UI stays consistent. Public catalogue responses can be prefetched (next page) for perceived speed.

---

## 11. Catalogue, UX, and Performance

- **DB-backed pagination:** `skip/limit` + `countDocuments`; never slice large arrays in memory for core pagination.
- **URL-driven state:** search, filters, sort, page in query params — shareable and back/forward friendly.
- **Prefetching:** `IntersectionObserver` + `prefetchQuery` makes next page navigation feel instant.
- **Images:** use `next/image` optimization and `sizes` appropriately (Lighthouse/perf improvements recorded in build log).
- **Escaped regex search:** user input is escaped before regex to reduce injection/ReDoS risk (tradeoff: full-text search engine would scale better for complex search).

---

## 12. Admin Console

### Features
- Dashboard: revenue/orders/books/customers/low stock/pending fulfilment.
- Books: list/search/low-stock/pagination, create, edit, delete (with confirmation). Create uses a modal; **edit uses a dedicated page** `/admin/books/[id]` backed by `GET/PATCH /api/admin/books/:id`.
- Orders: list/search/status/detail/status updates (cancellation restores stock as designed).
- Users: customer list and role management.

### Why a dedicated edit page (not modal from list row)?
List rows may contain partial data; modals have AntD form lifecycle/mount timing pitfalls (`form` instance not connected / values set too early). A page route loads full book data by id, has clear loading/error states, works with browser navigation/refresh, and is easier to debug. The fix also added `GET /api/admin/books/[id]`, shared form/value mapping, and cache invalidation.

### Security
All admin handlers require admin role server-side; layout is `noindex`; role changes have safety rails and invalidate stale sessions via `tokenVersion`.

---

## 13. Email and Async Side Effects

- `queueEmail()` records an `EmailJob` and schedules delivery with `after()` so HTTP responses return quickly.
- Templates cover: welcome, login alert, password reset/changed, order confirmation, stock alert.
- **No SMTP configured:** jobs are marked `skipped` so local dev and core flows (except actual inbox delivery) still work. Password reset links only help if email is actually delivered.
- **Tradeoff:** without a background worker/retry queue, post-response delivery is best-effort in simple setups; DB records help observability.

---

## 14. API and Error Handling

### Envelope pattern
- Success: `{ success: true, data, pagination? }` (shape varies by endpoint).
- Error: `{ success: false, error: { message, details? } }`. Zod issues become `details: [{ field, message }]`.

### Why this matters
Consistent envelopes let the Axios client show friendly messages and map validation errors to specific form fields (`getFieldErrors`). It also avoids leaking stack traces/internal details in 500 responses.

---

## 15. Testing, Quality, and Known Tradeoffs

### Implemented checks (project history)
- `npm run typecheck` (`tsc --noEmit`)
- `npm run lint` (ESLint)
- `npm test` (Vitest; build log records 36/36 passing for money/deterministic demo data/validators)
- `npm run build` (Next production build)
- Lighthouse script/audit (recorded strong scores in build log)

### Known gaps / honest tradeoffs (good to mention in review)
- In-memory rate limiting doesn’t scale horizontally without shared storage.
- SMTP/Google OAuth need real credentials for full live flows.
- More integration/E2E/CI automation would strengthen confidence.
- Demo commerce data is deterministic by design, not real market data.
- PDF/XD bitmap parity had tooling/asset limits; CSS/JSON tokens were used for alignment.

---

## 16. Likely Review Questions and Strong Answers

### Architecture & stack
**Q: Why Next.js App Router instead of separate React + Express?**  
A: One codebase can serve UI and typed Route Handlers, share TypeScript types/validation patterns, and simplify deployment. Route Handlers give explicit REST-like endpoints that we also document via OpenAPI.

**Q: Why both Redux and TanStack Query?**  
A: They solve different problems. Redux stores client/session-local state that must be immediately available and persist across UI (auth user, guest cart in localStorage). TanStack Query manages server state — fetching, caching, deduping, retries, stale data, and invalidation after mutations.

**Q: Why MongoDB/Mongoose?**  
A: Book metadata and order snapshots are document-friendly; Mongoose provides schemas, validation hooks, and model APIs. Atlas works consistently across environments.

### Auth & security
**Q: Where is the JWT stored and why?**  
A: In an `httpOnly`, `sameSite=lax` cookie (`bookstore_session`). The browser sends it automatically; JavaScript cannot read it, reducing XSS token-theft risk compared to `localStorage`.

**Q: If JWT is stateless, how do you log users out after password reset?**  
A: The JWT includes `tv` (`tokenVersion`). On each authenticated request we verify the signature *and* load the user to compare `tokenVersion`. Password reset/change bumps it, so old tokens fail verification.

**Q: Is `proxy.ts` your security?**  
A: No. It’s an optimistic UX guard (redirects). Every protected Route Handler re-checks authentication/authorization on the server.

**Q: Why store password reset tokens in DB? Why not only JWT expiry?**  
A: The reset link is used in a later request. We store only a **hash** of the token, enforce **single-use** via `usedAt`, and rely on TTL for cleanup. A JWT `exp` gives time-limiting but not easy single-use/revocation without server-side state.

### Data & commerce
**Q: How do you get 1,000 books and prices?**  
A: Books are imported from Gutendex (metadata) by `sourceId` upsert. Gutendex has no prices/stock/ratings, so we generate deterministic demo values in `lib/money.ts` and mark `isDemoData: true`.

**Q: How do you prevent a user from changing the price in checkout?**  
A: The server recalculates totals from authoritative book/cart data and creates immutable order snapshots. Client-submitted totals are not trusted.

**Q: How do you prevent overselling stock?**  
A: Checkout uses atomic conditional updates (only decrement when enough stock exists) and rolls back earlier decrements if a later item fails.

### Collections
**Q: Why do `emailjobs`, `passwordresettokens`, and `stockalerts` exist?**  
A: They persist workflow state across time/requests: email needs async observability and non-blocking delivery; password reset needs secure, single-use, short-lived verification; stock alerts must wait until restock. They’re normal production collections created when those features run.

### Frontend
**Q: How does guest cart become a user cart?**  
A: Guest items live in Redux + `localStorage`. After login/`/auth/me` bootstrap detects a user, `AuthBootstrap` merges guest items into the server cart (`/api/cart/merge`) and clears local guest cart.

**Q: Why is admin book edit a separate page?**  
A: It loads full data by id (`GET /api/admin/books/:id`), avoids list-row partial data and AntD modal/form lifecycle issues, and provides robust loading/error/navigation behavior.

---

## 17. If Asked “What Would You Improve Next?”

Give honest, technically plausible answers:
1. Replace in-memory rate limiting with Redis/Upstash for multi-instance deployments.
2. Add API integration tests and Playwright E2E; wire CI.
3. Add background worker/retry strategy for email jobs in production.
4. Tighten Atlas network access and rotate/audit secrets.
5. Add full-text search (Atlas Search/Elasticsearch) if search requirements grow.
6. Reconcile dark mode provider state with `prefers-color-scheme` and test AntD/CSS parity.
7. Define retention/cleanup for `emailjobs` and `stockalerts`.

---

## 18. File Pointers (for demoing in review)

- Auth/session: `src/lib/auth.ts`, `src/proxy.ts`, `src/app/api/auth/*`, `src/lib/security.ts`
- Money: `src/lib/money.ts`
- DB: `src/lib/db.ts`, `src/models/*`
- Import: `src/scripts/importBooks.ts`, `src/scripts/refreshStorefrontFields.ts`
- Checkout/orders: `src/services/orderService.ts`, `src/app/api/orders/*`
- Cart merge/bootstrap: `src/app/providers.tsx`, `src/hooks/useCart.ts`, cart APIs/services
- Admin edit flow: `src/app/admin/books/[id]/page.tsx`, `src/components/admin/AdminBookEditClient.tsx`, `src/app/api/admin/books/[id]/route.ts`
- Email/jobs: `src/lib/mailer.ts`, `src/models/EmailJob.ts`
- Reset tokens: `src/models/PasswordResetToken.ts`, auth reset handlers/services
- Stock alerts: `src/models/StockAlert.ts`, `src/services/stockAlertService.ts`

---

*End of guide. Use this alongside `docs/architecture.md`, `docs/development-rationale.md`, `docs/build-log.md`, and `docs/review-log.md` when preparing specific evidence (test counts, Lighthouse results, step history).*