# Build log

One entry per step: what was built, files touched, how it was checked.
Environment: Windows, Node 25.8.1, Next.js 16.4.5, React 19.3, MongoDB Atlas.
Last updated: 7 Nov 2026.

Local commands:

```bash
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
npm run build && npm start
LIGHTHOUSE_URL=http://localhost:3002 npm run lighthouse
```

## Step 1: Project setup and Git
Status: done.
- Next.js app created with TypeScript, ESLint, Tailwind, App Router, `src/` directory, `@/*` alias.
- `.gitignore` extended with `!.env.example`; `.env.example` documents every variable.
- Initial commit pushed to `main`.

## Step 2: Backend foundation
Status: done.
- `src/lib/db.ts`: cached Mongoose connection; failed connections are not cached.
- `src/models/Book.ts`: Gutendex metadata plus storefront fields (`price`, `originalPrice`, `stock`, `rating`, `reviewCount`, `isDemoData`).
- `GET /api/health` returns `{"success":true,"db":"connected"}`.
- Database `Bookstore`; the app model maps to the lowercase `books` collection.

Checks:
- [x] `GET /api/health` → `{"success":true,"db":"connected"}`
- [x] `books` collection and indexes exist after first use

## Step 3: Catalogue data (1,000 Gutendex books)
Status: done.
- `src/scripts/importBooks.ts` (`npm run import:books`): pages through Gutendex, normalises authors (`"Last, First"` → `"First Last"`), and upserts **exactly 1,000 unique books** by `sourceId`.
- `src/scripts/refreshStorefrontFields.ts` (`npm run refresh:books`): regenerates the deterministic demo storefront fields.
- **Bug fixed:** the schema defaults `stock` to `0`, so imported books all rendered "out of stock". Refreshing updated all 1,000 records: **948 in stock, 52 genuinely out of stock** (3 or fewer copies = low stock in admin).
- No Gutendex price exists; demo prices/ratings are deterministic per Gutenberg id and flagged with `isDemoData: true`.

Checks:
- [x] `db.books.countDocuments()` → 1,000
- [x] `db.books.countDocuments({ stock: { $gt: 0 } })` → 948
- [x] Catalogue no longer shows every book as out of stock

## Step 4: Authentication and security
Status: done (Google OAuth code complete, credentials not configured).
- `POST /api/auth/register`, `/login`, `/logout`, `GET /me`, `PATCH /profile`.
- JWT (`jose`) in the HTTP-only `bookstore_session` cookie; `sameSite=lax`, `secure` in production, 7-day expiry.
- `tokenVersion` invalidates all existing sessions after a password change/reset.
- bcrypt password hashing; Zod validation; field-level error details.
- Password reset: `forgot-password` issues a single-use SHA-256-hashed token; `reset-password` consumes it.
- Google OAuth: authorization-code flow with a state cookie and safe `next` redirect (`src/app/api/auth/google/*`).
- Fixed-window rate limiting on credential endpoints and same-origin checks on browser writes (`src/lib/security.ts`).
- `src/proxy.ts` redirects signed-out visitors from `/profile`, `/orders`, `/admin` and enforces admin role for `/admin`; every Route Handler re-checks auth server-side.
- Auth navigation hardening: `/login` and `/signup` are matched by `src/proxy.ts`; authenticated sessions are redirected to a safe `next` path (default `/`). Login/signup clients use `router.replace(...)` after successful auth and redirect away when Redux auth is ready and a user is present, so Back does not return to the auth form in normal flow.

Checks:
- [x] Signup, login, logout, profile update tested through the UI
- [x] Admin promotion via `npm run make:admin -- <email>` then re-login refreshes the JWT
- [x] Authenticated Back/direct access to `/login` or `/signup` is redirected/replaced (proxy + client `router.replace`)
- [ ] Google OAuth live round-trip — needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`

## Step 5: Catalogue API and storefront
Status: done.
- `GET /api/books`: DB-backed pagination (`skip`/`limit` + `countDocuments`), search, category, author, price range, stock filter, five sorts.
- `GET /api/books/facets`: categories, authors, price range.
- `GET /api/books/[id]`, `/related`, `/reviews` (list + summary; review creation is upsert-per-user).
- Public list responses send `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`.
- Storefront recreated from the XD geometry (not a template): Roboto, `#A03037` brand, 1018 px content, 60 px header, 50 px footer, 4/3/2-column responsive grid, numbered pagination (12/page, 84 pages).
- An `IntersectionObserver` sentinel prefetches the next page through TanStack Query so page jumps feel instant.
- Search, filters, sort and page live in the URL; TanStack Query caches and keeps previous data while paging.
- Detail page: cover, struck original price, rating badge, description, customer feedback form, related books.

Checks:
- [x] Catalogue renders 12 cards and `Books (1,000 Items)`; pagination 1–7 of 84
- [x] Filters/search/sort update the URL and results
- [x] Detail shows `Rs. 449` / struck `Rs. 600`, 3.6 (0) rating and 4 related books

## Step 6: Wishlist, cart, addresses and orders
Status: done.
- Wishlist: one row per user/book, add/remove from cards, quick view and detail page; `/wishlist` list + empty state.
- Cart: guest cart in Redux + localStorage, merged into the server cart on login/signup (`POST /api/cart/merge`); quantity update and remove.
- Addresses: CRUD with one default (`/api/addresses`).
- Checkout: 3 XD steps (My cart → Address details → Order summary), COD only, `Rs. 49` shipping below `Rs. 499`, free above.
- Orders: server recomputes totals, snapshots item price **and originalPrice**, decrements stock atomically with rollback on failure, creates `BK-YYYYMMDD-XXXXXX`, queues confirmation email, clears cart.
- Order pages: success, list, detail with status timeline and payment summary.

Checks:
- [x] Wishlist add/remove through the UI and API
- [x] Cart line item, summary and header count
- [x] COD order placed: `BK-20261107-7F0915`, `Rs. 449 + Rs. 49 = Rs. 498`
- [x] Order success page, orders list (struck `Rs. 600`) and order detail verified

## Step 7: Admin console
Status: done.
- `/admin`: revenue (excluding cancelled), order/book/customer counts, low-stock count, recent orders.
- `/admin/books`: search, low-stock filter, create/edit/delete with confirmation, stock changes trigger notify-me emails.
- `/admin/orders`: search, status filter, status changes, detail drawer.
- `/admin/users`: customer list with role/provider badges and customer ↔ admin role changes.
- Admin layout is `noindex`; server-side role checks on every admin handler.
- Role changes bump the user's `tokenVersion`, so their existing sessions are signed out. The API blocks changing your own role and refuses to demote the last admin.

Checks:
- [x] Dashboard shows revenue `Rs. 498`, 1 order, 1,000 books, 52 low stock
- [x] Orders table shows the real order and a working status selector
- [x] Book create/edit/delete and stock update verified

## Step 8: Email, logging, docs and tooling
Status: done (SMTP credentials not configured).
- Winston logger; `ApiError` → consistent JSON error envelope; unexpected errors never leak internals.
- Nodemailer templates: welcome, login alert, order confirmation, password reset/changed, stock alert. `queueEmail()` writes `EmailJob` and sends with `after()`; with no SMTP the job is marked `skipped` so auth/checkout still work.
- Swagger/OpenAPI at `/api/openapi` and `/docs`.
- `sonar-project.properties`, `scripts/lighthouse.mjs`, `.env.example`, README, `docs/architecture.md`.

Checks:
- [x] `/docs` renders the API surface
- [x] Registration/checkout log `Email not sent because SMTP is not configured` instead of failing
- [ ] Real inbox delivery — needs SMTP credentials

## Step 9: Design parity and frontend hardening
Status: done, with one asset limitation.
- `globals.css` rebuilt as the XD design system (tokens, header/footer, cards, catalog, detail, cart, auth, account, admin) plus responsive rules.
- Auth screens match XD geometry (727×425 card, 389×425 form panel, 35 px inputs, labels 13 px) without a scrollbar.
- Auth backdrop matches the XD artboard: white page, full-bleed black rectangle at 31% opacity, `#f5f5f5` illustration panel.
- Header, footer, cards, catalog, detail, wishlist, cart, orders and profile all recreated from XD measurements.
- antd v6 cleanup: `Alert message` → `title`, Drawer `width` → `size`, `destroyOnHidden`, `data-scroll-behavior`.
- Accessibility: rating badge contrast fixed (`#2E7D32`), card title `h3` → `h2`, removed mismatched `aria-label` on cover links and account menu, visible text included in accessible names.
- Images: removed `unoptimized`, added `sizes`, enabled Next image optimization, priority for the first page of covers.
- Detail rating bug fixed: an empty reviews summary used to force `0.0 (0)`; it now falls back to the catalogue rating (`3.6 (0)`).

Checks:
- [x] Lighthouse accessibility 100
- [x] All 12 page-1 covers served via `/_next/image` and fully decoded
- [x] No antd deprecation warnings in the console
- [ ] Pixel-identical auth illustration — XD bitmap asset bytes are unavailable; the background/panel match and the artwork is an SVG approximation

## Final verification (real results)
| Check | Result |
|---|---|
| `npm run typecheck` | pass, no output |
| `npm run lint` | pass, no output |
| `npm test` | 3 files, **36/36 tests pass** |
| `npx next build` | success (16 pages + 32 route handlers; `/` static, detail/admin/api dynamic) |
| `GET /api/health` (prod) | `{"success":true,"db":"connected"}` |
| Lighthouse, prod `http://localhost:3002`, desktop preset 1366×900 | **98 / 100 / 100 / 100** (performance / accessibility / best practices / SEO), report `lighthouse-report/localhost-1794072197738.json` |
| Manual UI flows | signup, login, wishlist, cart, COD checkout, order list/detail, admin dashboard/orders — all pass |

Lighthouse metrics for the final report: FCP 0.2 s, LCP 1.0 s, TBT 10 ms, CLS 0.

## Step 10: XD/ZIP design context applied (frontend hardening)
Status: done (targeted, low-risk alignment).
- Parsed `Bookstore-22-Pages.pdf` metadata and `drive-download-20261106T115753Z-1-001.zip` (24 AGC/XD JSON exports: home/catalog, auth, book detail states, cart/order, wishlist, profile, interactions/resources).
- Confirmed XD tokens/surfaces used in implementation: `1366` canvas patterns, brand `#A03037` (`rgb(160,48,55)`), Roboto sizing in card/meta text, auth overlay/backdrop geometry, book cards, quick view, wishlist/orders/profile sections, and navigation labels.
- Frontend changes applied from this context:
  - System dark mode follows user preference (`prefers-color-scheme`) via Ant Design algorithm + token switching and CSS variable overrides; hardcoded light backgrounds/borders/text in key storefront/admin surfaces replaced with variables where safe.
  - Catalog heading now matches the XD `Books` title; the item count, “Showing X–Y of Z” subtitle, and filter controls were later removed (see Step 12).
  - Wishlist heading count formatting aligned to list context (`My Wishlist (N)`).
  - Auth social button text uses normalized `Facebook`; the XD export typo `Facbook` was intentionally not reproduced.
  - Logout flow hardened (always clears local auth/cache state; cookie cleared by API; menu clickability fixed).

## Step 11: Admin book edit page (reliability fix)
Status: done.
- Admin Books → **Edit** now navigates to a dedicated page (`/admin/books/[id]`) instead of opening an edit modal from list-row data. **Add book** remains modal-based.
- Added `GET /api/admin/books/[id]` (admin-only, `no-store`) and `getAdminBook()` service helper so the edit page loads full book data by id.
- Added `AdminBookEditClient` (loading/error states, cover/metadata, shared form, save/cancel, back navigation) and `src/app/admin/books/[id]/page.tsx` (Next 16 `params: Promise<{ id: string }>`).
- Refactored `AdminBookFormModal` into shared `AdminBookForm` + `getBookFormValues`/`toPayload`/`splitList`; added safe defaults for optional book fields, `forceRender` modal form mounting to avoid AntD “form not connected / set fields” lifecycle errors, and typed API field errors (`NamePath`).
- `useUpdateAdminBook` now invalidates `["admin","book",id]` in addition to admin/catalogue caches.

Checks:
- [x] `npm run typecheck`
- [x] `npm run lint` (only unrelated `coverage/block-navigation.js` warning)

## Step 12: Final XD cleanup, geometry verification, and documentation
Status: done.
- Restored the reference header actions (Wishlist, Cart, Login, Sign up) and category navigation after checking the 22-screen PDF. The profile menu remains for signed-in users; the mobile drawer remains available below laptop width. Removed catalogue subtitle/count and footer links that are not shown in the reference; the footer keeps the copyright line only.
- Catalogue heading is `Books`; the sort dropdown and numbered pagination remain. Quick view stays because the XD cards show it.
- Corrected the desktop catalogue grid to the XD geometry: 4 columns, 235 px tracks, 26 px gap (`4×235 + 3×26 = 1018`); card height 275 px with a 172 px cover; the 3-column 1024–1100 px override was removed.
- Updated `docs/development-rationale.md`: removed stale filter/related/card-wishlist claims, documented the final cleanup, added §19 SonarQube (configuration only, no scanner/CI) and §20 data-retention/privacy guidance.
- Updated README Sonar note and corrected stale build-log bullets (catalog count, `Facbook`).

Checks (this run):
- [x] `npm run typecheck` - pass, no output
- [x] `npm run lint` - 0 errors, 1 pre-existing warning in generated `coverage/block-navigation.js`
- [x] `npm test` - 3 files, 36/36 tests pass
- [x] `npm run build` - success, 41 routes. The host had ~2 GB free RAM, so the build was verified with a temporary `experimental.cpus: 2` worker cap; the temporary config change was reverted afterwards.

Open limitation: Sonar is not runnable out of the box (no scanner dependency/script/CI, and `coverage/lcov.info` is not generated by `npm test`). See `docs/development-rationale.md` §19.
