# Fundoo Books (Bookstore) — Development & Rationale

This document explains **how each major part of the `bookstore/` project was developed** and **why it was implemented the way it was**. It is grounded in the codebase, existing docs (`architecture.md`, `build-log.md`, `review-log.md`), and the recorded project/session history. Where the local git history is sparse (only a few commits), decisions are documented from build/review logs and implementation evidence rather than commit messages.

## 1. Product Goal and Constraints

### What was built
A production-structured full-stack bookstore using **Next.js App Router** with **MongoDB Atlas** and **Ant Design**. The catalogue contains **1,000 unique Project Gutenberg books** imported from **Gutendex**. Users can browse as guests, search/paginate, view details/reviews, manage wishlist/cart, place **cash-on-delivery (COD)** orders, track orders, and manage accounts. Admins can manage catalogue/orders/customers.

The storefront UI is intentionally narrower than the API: the final XD pass removed filter controls, the catalogue item-count/subtitle, related-books UI, card wishlist buttons, and footer links that do not appear in the 22 reference artboards. The header wishlist/auth actions and category navigation shown in the PDF are retained. The supporting APIs (`/api/books/facets`, `/api/books/[id]/related`, category/price/stock query parameters) remain available and are documented in OpenAPI.

### Why this way
- **Gutendex provides metadata, not commerce data.** The importer derives storefront fields (`price`, `originalPrice`, `stock`, `rating`, `reviewCount`) deterministically from `sourceId` and stores `isDemoData: true` so the UI can be shoppable without claiming Gutendex supplied prices/ratings/stock. This avoids fabricating “real” pricing while keeping behavior stable across runs.
- **Atlas over local MongoDB.** The same database approach works in development, CI-like checks, and Vercel deployment.
- **Explicit API layer (Route Handlers).** Business logic lives in services and handlers expose an HTTP surface that is also documented via OpenAPI/Swagger; this keeps the system testable and reusable.

## 2. Technology Stack (and reasons)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.4.5 (App Router, Route Handlers, `proxy.ts`) | Modern full-stack React framework; Route Handlers give explicit HTTP APIs; `proxy.ts` used only for optimistic page redirects. Next 16 has breaking changes — `AGENTS.md` requires consulting bundled Next docs before framework-specific edits. |
| UI | React 19.3, TypeScript, Ant Design 6, Tailwind CSS 4, global CSS design system | Fast delivery with accessible primitives (AntD) plus XD-specific layout fidelity in `globals.css`. |
| Client state | Redux Toolkit + TanStack Query | Redux holds **session user** and **guest cart** (needs to work before login/local persistence). TanStack Query manages server/cache state (catalogue, cart, wishlist, orders, admin) with invalidation, retries, and prefetching. |
| HTTP | Axios client (`/api`) | Typed envelopes and centralized error handling. |
| Database | MongoDB Atlas via Mongoose 9 | Document model fits book/order snapshots; cached connection prevents Atlas connection exhaustion. |
| Auth | JWT in HTTP-only cookie (`jose`) + bcrypt | Cookie is not readable by JS (XSS mitigation); `sameSite=lax` helps against cross-site writes; bcrypt hashes passwords. |
| Validation | Zod | Rejects untrusted payloads before services; field errors map to UI forms. |
| Email | Nodemailer + `EmailJob` queue | Transactional flows should not fail locally without SMTP; `after()` avoids blocking responses. |
| Docs/quality | OpenAPI `/api/openapi` + `/docs`, ESLint, TypeScript, Vitest, Lighthouse script | Keeps API discoverable and enforces baseline correctness/performance checks. |

## 3. Project Structure

Key areas under `bookstore/src/`:
- `app/` — App Router pages/layouts and Route Handlers (`app/api/**/route.ts`).
- `components/` — feature UI (layout, catalog, books, auth, checkout, orders, admin, profile).
- `services/` — business logic used by handlers (thin handlers: validate/auth/host/rate-limit → service).
- `models/` — Mongoose schemas/models.
- `validators/` — Zod schemas for requests/queries.
- `store/` — Redux Toolkit store/slices/actions for auth + guest cart.
- `hooks/` — TanStack Query hooks and unified cart behavior.
- `lib/` — env, DB connection, auth/JWT/cookies, money, mailer, security, OpenAPI, logger, API error handling.
- `scripts/` (src + repo scripts) — Gutendex import, demo-field refresh, admin promotion, Lighthouse.
- `types/` — shared types.
- `docs/` — architecture, build log, review log, and this rationale.

**Why:** Separating handlers, services, validators, and models reduces coupling, makes authorization/validation explicit at the edge, and keeps money/auth rules centralized.

## 4. Database and Data Model

### How
- `src/lib/db.ts` caches the Mongoose connection on `globalThis`, uses `bufferCommands: false`, a pool size, and **does not cache a rejected promise** so failed connects can retry.
- Database is `Bookstore` (URI/MONGODB_DB_NAME controls naming). The app uses the `books` collection/model mapping.
- Models include: `Book`, `User`, `Cart`, `Wishlist`, `Address`, `Order`, `Review`, `PasswordResetToken`, `EmailJob`, `StockAlert` (see `src/models/`).
- Important indexes (per architecture): `books.sourceId` unique; book search/support indexes (`isbn`, `title`, `authors.name`, `subjects`); `users.email` unique; `users.googleId` sparse unique; `users.role`; order/review lookups by user/book.

### Why
- **Cached connection / retry on failure:** prevents connection storms in dev/hot reload and avoids permanent failure after a bad first connect.
- **`sourceId` unique + upsert:** makes Gutendex import idempotent and guarantees the catalogue can be maintained at exactly 1,000 unique records.
- **Demo `stock` default pitfall:** schema defaults meant imported books could appear out of stock; `refresh:books` recomputes deterministic demo storefront fields (build log records 948 in stock, 52 out of stock) so the catalogue is usable.
- **Order snapshots:** orders store immutable item snapshots (including `price` and `originalPrice`) and copied address/customer info so later catalogue edits do not rewrite historical orders.
- **`tokenVersion`:** allows server-side session invalidation after password change/reset or sensitive role changes.

## 5. Gutendex Import and Demo Storefront Fields

### How
- `npm run import:books` (`src/scripts/importBooks.ts`): pages Gutendex, normalizes author names (`"Last, First"` → `"First Last"` where applicable), deduplicates by Gutenberg id, bulk upserts, verifies count; refuses URLs outside `gutendex.com`, retries transient failures, and is safe to rerun.
- `npm run refresh:books` (`src/scripts/refreshStorefrontFields.ts`): recomputes deterministic demo fields without calling Gutendex.
- `src/lib/money.ts` defines deterministic demo helpers (`demoPriceFor`, `demoOriginalPriceFor`, `demoStockFor`, `demoRatingFor`) and commerce constants.

### Why
- **Deterministic demo data:** stable prices/stock/ratings across imports and environments; no randomness that breaks reproducibility.
- **`isDemoData: true`:** transparent that values are generated, not sourced from Gutendex.
- **Refresh script:** fixes/import-updates derived fields without re-downloading the full upstream dataset.

## 6. Money and Pricing Rules

### How
- All storefront money is handled as **whole Indian Rupees**.
- `src/lib/money.ts` is the single source for:
  - `formatINR` (`Intl.NumberFormat("en-IN")`, e.g. `₹1,500`; returns `—` for null/NaN cases).
  - `FREE_SHIPPING_THRESHOLD = 499`, `STANDARD_SHIPPING_FEE = 49`.
  - `computeSummary(items)` → `itemCount`, `subtotal`, `shippingFee`, `total`, `freeShippingThreshold`.

### Why
- **Single formatter/rules module:** prevents inconsistent currency display and shipping math across catalog, cart, checkout, orders, and admin. Review/build logs explicitly note “not a single component formats currency by hand” as a design goal.
- **Server recomputes totals:** checkout never trusts client prices/totals (critical security/correctness decision).

## 7. API Design, Validation, and Error Handling

### How
- Route Handlers under `src/app/api/` (33 route files / 39 handlers by project analysis) follow: parse/validate → auth/host/rate-limit checks where needed → `connectDB()` → service → JSON envelope.
- Zod validators live in `src/validators/` and cover auth, address, cart, order, review, catalogue query, etc.
- Errors use `ApiError(status, message, details?)` / `handleRouteError`; envelope shape: `{ success: false, error: { message, details? } }`. Zod issues become field-level `details`.
- Public catalogue responses may be cacheable; authenticated responses use `no-store` / `Vary: Cookie` patterns (per architecture/review guidance).

### Why
- **Thin handlers + services:** keeps HTTP concerns separate from domain logic.
- **Validate all untrusted input:** prevents malformed data reaching services and supports clear form errors.
- **No internal leakage:** unexpected errors are logged server-side and returned generically.
- **Regex safety in search:** user search text is escaped before regex use (ReDoS/injection hardening).

## 8. Authentication, Sessions, and Authorization

### How
- Local auth: register/login/logout, `GET /api/auth/me`, profile/password flows, forgot/reset password.
- JWT (`jose`) is signed with `HS256`, includes `sub`, `role`, and `tv` (`tokenVersion`), stored in HTTP-only cookie `bookstore_session` (`sameSite=lax`, secure in production, max-age from expiry config). `getCurrentUser()` verifies signature, loads user from DB, and compares `tokenVersion`.
- Google OAuth uses authorization-code flow with state cookie and server-side token exchange/callback; sets the same session cookie.
- Passwords hashed with bcrypt. Google-only accounts cannot password-login incorrectly.
- `src/proxy.ts` provides **optimistic page guards only** (redirect UX), not a security boundary. Every protected API handler re-checks auth/role.
- Protected/admin page patterns: `/profile`, `/orders`, `/admin` guarded; `/cart` and `/wishlist` can render signed-out states and require session for actions as designed.
- Admin safeguards: server-side role checks on all admin handlers; role changes reject self-edits and demoting the last admin; target `tokenVersion` bumped so stale sessions lose old role.

### Why
- **HTTP-only cookie:** mitigates token theft via XSS compared to JS-readable storage.
- **DB-validated session + `tokenVersion`:** enables revocation/invalidation (password changes, resets, sensitive admin role changes).
- **Proxy is not security:** prevents a common Next.js mistake where middleware/redirect-only logic is treated as authorization.
- **Rate limiting + same-host checks:** reduce credential stuffing and cross-site write abuse. `assertSameHost` now checks `x-forwarded-host` before `host` for proxied/local edge cases.

## 9. Auth Navigation and Sign-Out Hardening (recorded fixes)

### How
- **Back to login/signup after auth:** `src/proxy.ts` matches `/login` and `/signup`; authenticated sessions are redirected to a safe `next` path (default `/`). `LoginClient`/`SignupClient` redirect when `auth.ready && auth.user` and use `router.replace(...)` after successful auth/guest-cart merge. `proxy.ts` matcher includes relevant protected/auth routes.
- **Sign-out reliability:** `POST /api/auth/logout` swallows `assertSameHost` errors in edge cases but **always clears the session cookie** and returns success with `noStoreHeaders`. `SiteHeader` and `AdminShell` clear client state in `finally` (`setUser(null)`, clear React Query cache where applicable, close menus/drawers), then `router.replace("/")` + `router.refresh()`.
- **Menu clickability:** header logout moved away from an AntD `Popconfirm` pattern that caused portal/outside-click issues to a direct action path.

### Why
- **`router.replace` vs `push`:** prevents the auth page from remaining a useful Back target after successful sign-in.
- **Always-clear logout cookie/state:** sign-out must be dependable even with proxy/host quirks; stale client cache/user state can make the UI appear signed in after cookie removal.
- **`finally` on client:** guarantees UI/session reset even if the network call warns/fails.

## 10. Catalogue, Search, and Performance

### How
- `GET /api/books` uses DB-backed pagination (`skip`/`limit` + `countDocuments`) with search, category/author, price range, stock filter, and sort orders. `GET /api/books/facets` supports filters.
- Catalogue shows **12 books/page** with XD-style numbered pagination (84 pages for 1,000 books); page/search/sort state is URL-driven.
- The catalogue UI exposes the **“Books”** heading and sort dropdown; category shortcuts live in the shared header as shown in the reference. The filter panel/facets UI, the “Showing X–Y of Z” subtitle, the item count, and related-books section were removed. Backend query support and the related/facets endpoints were kept because they are harmless, documented API surface.
- The desktop grid is **4 columns × 235 px with a 26 px gap** (`4×235 + 3×26 = 1018`), matching the XD Home artboards; it degrades to 2 columns below 1024 px.
- An `IntersectionObserver` sentinel **prefetches the next page** via TanStack Query (`prefetchQuery`) so numbered/page-next navigation feels instant while keeping TanStack’s previous-data behavior.
- Public list responses use cache headers (e.g. `s-maxage=120, stale-while-revalidate=600`); facets cached longer (per architecture). Mutations invalidate relevant query keys.
- Images: avoid unnecessary unoptimized shipping of large third-party covers; use `sizes`, Next image optimization, and prioritize first-page covers where implemented.

### Why
- **DB pagination, not in-memory slicing:** scales and keeps memory predictable.
- **URL state:** shareable/bookmarkable search, sort, and page state with correct back/forward behavior.
- **Prefetch + Query cache:** improves perceived performance without inventing a second caching system.
- **Escaped regex search:** pragmatic for catalogue size; accepted tradeoff documented in review log (prefix/contains behavior considerations).

## 11. Guest Cart, Server Cart, Wishlist, and Checkout

### How
- **Guest cart:** Redux + `localStorage` (hydrated via providers/bootstrap). Guests can shop without accounts.
- **Unified cart UX:** `useCart`/hooks present one interface; on sign-in, `AuthBootstrap` merges stored guest cart into MongoDB (`POST /api/cart/merge`), clears guest cart, and refreshes state.
- **Cart APIs:** `GET/POST /api/cart`, `PATCH/DELETE /api/cart/:bookId`, merge endpoint. (Project analysis noted `DELETE /api/cart` and `cartService.clear`/hook `clear()` exist; UI wiring for a global “clear cart” action may be absent — verify before relying on it.)
- **Wishlist:** add/remove/list; UI on the book-detail page and the wishlist page. The card-level wishlist button was removed during the final XD cleanup because the XD cards do not show one. (Unused export `wishlistService.getWishlistIds()` was identified during analysis; not a functional defect.)
- **Checkout (COD):** multi-step XD flow (cart → address details → order summary), address CRUD/default address, shipping rule via `computeSummary`, order confirmation flow.
- **Order creation:** server recomputes totals from authoritative data, validates availability/price, atomically decrements stock (`findOneAndUpdate` with `stock >= quantity` + price checks), rolls back prior decrements on failure, snapshots items/address/totals/status history, creates order number (`BK-YYYYMMDD-XXXXXX` pattern), queues confirmation email, clears cart.

### Why
- **Guest-first commerce:** reduces friction; merge prevents cart loss after login.
- **Never trust client totals/prices:** prevents tampering.
- **Atomic stock + rollback:** avoids overselling and partial inconsistent state on multi-item checkout failures.
- **Immutable snapshots:** preserves historical accuracy.

## 12. Admin Console

### How
- `/admin` area under `AdminShell`; admin layout/pages set `robots: noindex/follow` as appropriate. Every admin Route Handler performs server-side role checks.
- Features: dashboard stats (revenue excluding cancelled as designed), orders/books/customers/low stock/pending fulfilment; catalogue CRUD/search/low-stock/pagination; order list/search/status/detail and status updates (cancellation restores stock); customer/role management with safeguards.
- **Book edit flow:** list rows link to `/admin/books/[id]` (page) rather than editing from partial list data in a modal. `GET /api/admin/books/[id]` loads full data; `PATCH` saves; shared `AdminBookForm`/value mapping and `NamePath`-typed field errors reduce AntD form/modal lifecycle issues. “Add book” remains modal-based.

### Why
- **Server-side authorization everywhere:** hidden links are not access control.
- **Noindex:** admin UI should not be indexed.
- **Stock notifications:** restocking can trigger notify-me/stock-alert emails (when configured).

## 13. Email, Logging, and Observability

### How
- Winston logger for structured server logging.
- `queueEmail()` records an `EmailJob`, renders templates, and schedules delivery with `after()` so HTTP responses are not blocked. Without SMTP config, jobs are marked/skipped and flows continue; password reset is only usable when email is actually delivered.
- Templates include welcome, login alert, password reset/changed, order confirmation, stock alert (per build/review docs). See §20 for current retention/logging risks (plaintext reset URLs in `EmailJob.payload`, `preview` logging, and missing TTLs).

### Why
- **Non-blocking delivery:** protects user-facing latency.
- **Graceful local dev:** auth/checkout should remain testable without SMTP, while making email limitations visible.

## 14. XD / Design Alignment and UI Rationale

### How
- XD sources in `bookstore/`: `Bookstore-22-Pages.pdf` (22 artboards, used as a visual reference; its pages render as images without extractable text) and `drive-download-20261106T115753Z-1-001.zip` (24 AGC/XD JSON exports plus the extracted `xd-spec.json` used as the authoritative source for bounds, colors, and type).
- XD signals used: 1366 canvas, **1018 px content container**, 60 px header, 50 px footer, brand `#a03037`, Roboto, search `490×33` on `#fcfcfc`, icon-above-label actions, cart count mark, profile dropdown styling, `#f5f5f5` card cover surface, 3 px card radius.
- Final parity values: home cards are **235×275** with a **233×172** inner cover and **26 px** gutters in a 4-column grid; book-detail cover is **361×413** with a **50 px** gap; wishlist uses **1022 px** page width, **55 px** rows and **65×85** covers; auth card is **727×425** with the **389×425** form and a full-bleed black overlay at **31%**; checkout uses the XD **774 px** single column.
- The header follows the PDF home-screen reference: logo, search, Wishlist, Cart, and guest Login/Sign up actions above the category shortcut row. Signed-in users get the Profile menu; the mobile drawer retains Wishlist and Orders. The footer shows only the reference copyright line.
- Design system implemented primarily in `src/app/globals.css` (tokens, header/footer, catalog, detail, cart, auth, account, admin, responsive rules) with Ant Design theme tokens in `src/app/providers.tsx`.

### Why
- **CSS variables + tokens:** allows XD-aligned surfaces while keeping components adaptable (and compatible with the existing dark-mode overrides).
- **Remove extras rather than hide them:** deleting non-XD chrome keeps markup, CSS, and behavior honest; it also avoids dead query parameters and menu items that look supported but are not part of the design. Backend endpoints that are cheap to keep were retained and documented instead of being deleted.
- **Do not fake pixel parity without assets:** the PDF/XD exports do not embed the auth illustration bitmap (only a pattern fill), so an SVG/CSS approximation is used and documented. Likewise, some icon glyphs are AntD equivalents.
- **Copy policy:** prefer normalized product copy over literal XD typos/casing unless explicitly asked to mirror XD text. Design and color fidelity is the requirement; obvious export typos are not reproduced.

## 15. Responsive Navbar / Hamburger (recent change)

### How
- Files: `src/components/layout/SiteHeader.tsx`, `src/app/globals.css`. Composed via `AppShell`/`layout`.
- XD desktop exports show no mobile hamburger. Below laptop widths, navigation collapses into a Drawer; the trigger is shown for screens **less than laptop** (`max-width: 1023px`) and adjusts dynamically.
- The hamburger trigger was replaced with an **XD-consistent header action**: custom `MenuIcon` SVG, icon-above-label `Menu`, same `header-action` treatment as Profile/Cart (no AntD `MenuOutlined` button styling mismatch).
- Responsive behavior: search remains usable/flexible (`flex: 1 1 auto`, `min-width: 0`), header gaps/padding/action widths use `clamp()` below laptop, desktop-only profile dropdown hidden below laptop, Drawer provides navigation/actions.

### Why
- **XD fidelity + usability:** XD has no mobile artboard in the parsed exports, so the solution keeps XD visual language while supporting smaller screens.
- **Dynamic sizing:** avoids fixed breakage between tablet and small-laptop widths.

## 16. Dark Mode (history and current state)

### How (history/rationale)
- System dark mode was implemented to follow `prefers-color-scheme: dark` (AntD algorithm/token switching in providers and CSS variable overrides in `globals.css`). User later requested not to break dark-mode functionality and to keep design/color alignment.
- Header/navbar dark overrides exist in CSS (e.g., header/search/profile menu adjustments under `prefers-color-scheme: dark`).

### Current implementation note
- `providers.tsx` listens to `matchMedia("(prefers-color-scheme: dark)")` and switches AntD between `darkAlgorithm` and `defaultAlgorithm`; `globals.css` declares `color-scheme: light` on `:root` and re-declares the palette under `@media (prefers-color-scheme: dark)` at the end of the file. AntD and CSS tokens therefore move together.
- The XD design itself is a light design; dark mode is an additive system preference, not an XD state. Keep both paths in sync when changing tokens, and avoid hydration flashes (client-side providers + `suppressHydrationWarning` in `layout.tsx`).

### Why it matters
- Dark mode support must be treated as a behavioral requirement: CSS-only dark overrides without matching AntD algorithm/token behavior can produce inconsistent surfaces/controls.

## 17. Security and Correctness Decisions (cross-cutting)

- **No secrets in repo/logs:** `.env*` ignored except `.env.example`; generic client errors.
- **Authorization at handler/service boundary:** never rely on UI hiding or proxy redirects.
- **Password reset enumeration:** generic responses.
- **OAuth state + safe `next`:** prevents CSRF/open redirect.
- **Atomic/rolled-back stock updates:** prevents oversell.
- **Same-host/origin checks and rate limits:** defense-in-depth; in-memory rate limiter is per-process (scale-out needs shared store such as Redis/Upstash).
- **Admin safety rails:** cannot self-demote or demote last admin; role change invalidates stale sessions.
- **Data minimization/retention:** reset tokens are hashed and TTL-bound, but email payloads and stock-alert emails currently outlive their purpose; see §20 for the audit and recommended TTL/unsubscribe/log-redaction changes.

## 18. Testing, Quality, and Known Gaps

### How
- Commands: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`, `npm run lighthouse`.
- Recorded verification: 36/36 Vitest tests passing (INR formatting/shipping rules, deterministic demo data, Zod validators), production build success (41 routes), Lighthouse desktop 98/100/100/100 before the final UI cleanup.
- OpenAPI served at `/api/openapi` and Swagger UI at `/docs`.
- Vitest is configured in `vitest.config.mts` (`environment: "node"`, `src/**/*.test.ts`). `@vitest/coverage-v8` is installed, but there is **no `test:coverage` script** and the committed/reported `coverage/` output does not include `lcov.info`.
- E2E and visual-regression tests are intentionally **deferred**; they are not part of the current verification gate.

### Known gaps / accepted items
- Google OAuth and SMTP require credentials for live end-to-end delivery; code paths are implemented and degrade safely.
- In-memory rate limiting is not shared across instances (no Redis/Upstash by design, so it works without third-party services).
- No CI workflow and no E2E/visual-regression suite yet.
- SonarQube configuration exists but is not wired into a runnable scanner step (see §19).
- Stale Atlas collection casing (`Books` vs `books`) may exist; app uses lowercase `books`.
- Pixel-identical XD artwork needs original bitmap assets; the auth illustration is necessarily an approximation.
- Git history in this checkout is minimal; rely on docs and code evidence for rationale.

## 19. Static Analysis (SonarQube)

### What is actually implemented
- A single repository file, `sonar-project.properties`, defines the Sonar project:
  - `sonar.projectKey=fundoo-books-bookstore`, name, version, UTF-8 encoding.
  - `sonar.sources=src` and `sonar.tests=src`, with `sonar.test.inclusions=src/**/*.test.ts`.
  - Exclusions for tests, `node_modules`, `.next`, `coverage`, and `public`.
  - `sonar.javascript.lcov.reportPaths=coverage/lcov.info` and `sonar.typescript.tsconfigPath=tsconfig.json`.
- There is **no** scanner dependency/script in `package.json`, no `sonar-scanner` executable on the machine, and no CI workflow. In other words, Sonar is **configured, not integrated**: the properties file is ready for a scanner/quality gate, but nothing currently runs it automatically.

### Why this shape
- The properties file is the only vendor-neutral artifact needed to point Sonar at the source tree, tests, TypeScript config, and coverage report; it keeps the repo portable across local Docker, a Sonar server, or SonarCloud.
- Keeping it declarative avoided adding a heavyweight scanner dependency to the app bundle and avoided committing credentials. Tokens belong in CI secrets/environment variables, never in the repo.

### How to run it (recommended next step)
1. Generate coverage in the format Sonar expects: `npx vitest run --coverage --coverage.reporter=lcov` (or add a `test:coverage` script).
2. Run the scanner with `SONAR_TOKEN` and `SONAR_HOST_URL` from the environment, e.g. `npx sonar-scanner` or the official `sonarsource/sonar-scanner-cli` Docker image.
3. Enforce the quality gate in CI (the missing piece today) so a failing gate blocks merges.

### Caveats
- `coverage/lcov.info` is currently absent, so a scan today would report **0% coverage** even though unit tests pass. The configured path is correct; the report simply is not generated by `npm test`.
- The properties file lists `src` as both sources and tests while also excluding test files from analysis; this is valid for Sonar (tests contribute test counts, not production metrics) but should be reviewed if test/source separation becomes confusing.
- No E2E/visual coverage is reported to Sonar; those suites are deferred.

## 20. Data Retention and Privacy Review (guidance)

This section records what the code currently stores and what should change before production. These are recommendations; backend hardening is owned by the project, and no schema changes were made as part of the UI work.

### Current state
- **Password reset tokens — mostly good.** `PasswordResetToken` stores only a SHA-256 `tokenHash` (never the raw token), enforces a 1-hour `expiresAt`, is single-use via `usedAt`, deletes older tokens when a new reset is requested, deletes sibling tokens after a successful reset, and has a MongoDB TTL index on `expiresAt`. The remaining exposure is downstream: the raw reset URL is placed in `EmailJob.payload`.
- **EmailJob — retention/PII risk.** `EmailJob` stores recipient `to`, a rendered `subject`, `template`, and an arbitrary `payload` that can include names, order contents/totals, password-reset URLs, and stock-alert links. There is **no TTL**. When SMTP is not configured, `mailer.ts` logs `preview: job.payload`, which writes the plaintext reset URL (and other PII) to application logs.
- **StockAlert — indefinite PII.** Guests can subscribe with an email even without an account (`requireUser().catch(() => null)`); uniqueness is `(bookId, email)` and writes are rate-limited to 20/hour/IP. There is no TTL, unsubscribe flow, or automatic deletion after `notifiedAt`.
- **Orders, users, addresses.** Customer name, email, phone, and address snapshots are retained indefinitely as part of order history (intentional for order accuracy/accounting), but there is no documented retention period or deletion workflow.
- **Infrastructure.** Atlas network access was observed as `0.0.0.0/0` during the audit. That is convenient for development but should be narrowed to deployment egress/Vercel ranges (or a private endpoint) for production.

### Recommended hardening
- **Do not log email payloads.** Remove `preview: job.payload` or log only `template`/`jobId`; never log reset URLs, tokens, addresses, or order contents. Prefer structured redaction in the logger.
- **Minimize EmailJob payloads.** Store only what is needed to render/deliver, and clear `payload` (or the sensitive fields) after `sent`/`skipped`. If a preview is needed locally, write it to a git-ignored dev file rather than logs.
- **Add TTL indexes.** e.g. delete sent/skipped/failed `EmailJob` documents after 7–30 days, and delete `StockAlert` rows shortly after `notifiedAt` (or after an explicit opt-out). MongoDB TTL indexes are the simplest no-cron option.
- **Add unsubscribe/deletion for stock alerts**, and collect consent with the email address. Validate/normalize emails as now, and cap repeat subscriptions.
- **Define retention periods** for orders/addresses/users (for example, keep order records for the accounting period, then anonymize PII while preserving aggregate totals), and document the privacy policy and data-deletion request path.
- **Rotate/limit secrets and database access.** Keep `SONAR_TOKEN`, SMTP, OAuth, and MongoDB credentials in environment/secret stores; restrict Atlas IP access; use least-privilege DB users.
- **Verify backups and access logs** have their own retention policy, since deleting data from the primary database does not remove it from backups immediately.

## 21. Files Most Relevant to Current Behavior

- Layout/shell: `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `Logo.tsx`
- Providers/state: `src/app/providers.tsx`, `src/store/**`, `src/hooks/useCart.ts`, `src/hooks/queries*`, `src/hooks/admin.ts`
- Auth/security: `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/security.ts`, `src/app/api/auth/logout/route.ts`, auth route handlers, `LoginClient.tsx`/`SignupClient.tsx`
- Commerce: `src/lib/money.ts`, `src/services/orderService.ts`, `cartService.ts`, `wishlistService.ts`, cart/order/wishlist/address APIs
- Admin: `src/components/admin/*`, `src/app/admin/**`, `src/app/api/admin/**`, `src/services/adminBookService.ts`
- Data/import: `src/lib/db.ts`, `src/models/**`, `src/scripts/importBooks.ts`, `refreshStorefrontFields.ts`, `makeAdmin.ts`
- Styling: `src/app/globals.css`
- Reference docs: `docs/architecture.md`, `docs/build-log.md`, `docs/review-log.md`, `docs/development-rationale.md`

## 22. Maintenance Guidance

- Before Next.js framework edits, consult `node_modules/next/dist/docs/` as required by `AGENTS.md`.
- Keep totals/pricing logic server-authoritative and centralized in `src/lib/money.ts` / services.
- Preserve `tokenVersion` and DB-backed auth checks when changing session behavior.
- When changing XD-aligned UI, keep **design/color fidelity** and **responsive behavior** intact; only mirror XD copy literally when explicitly requested.
- Re-run `npm run typecheck` and `npm run lint` in `bookstore/` after changes; run Vitest/build/Lighthouse as appropriate for the scope.
