# Review log

Every change is reviewed for security, correctness, performance and maintainability. Findings are recorded per step.
Last updated: 7 Nov 2026.

## Step 1: Project setup and Git
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `.gitignore` | Default `.env*` rule also ignores `.env.example` | Medium | Fixed (`!.env.example`) |
| 2 | `.env.local` | Must never be committed (holds secrets) | Critical | Covered by `.gitignore`; verified with `git status` |

## Step 2: Backend foundation
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `lib/db.ts` | Reconnecting on every request or hot reload exhausts Atlas connections | High | Fixed: connection cached on `globalThis` |
| 2 | `lib/db.ts` | A failed first connect would cache the rejected promise forever | High | Fixed: promise reset on failure |
| 3 | `lib/db.ts` | Throwing on missing connection string at import time breaks `next build` | Medium | Fixed: checked inside `connectDB()` |
| 4 | `api/health/route.ts` | Returning the raw error could leak the Atlas host | Medium | Fixed: generic 503 to the client, detail logged server-side |
| 5 | `models/Book.ts` | `isbn` must not be unique (many books have none) | Medium | Fixed: plain index |
| 6 | `models/Book.ts` | `stock` defaults to 0 and `price` has no default; unpriced books must not be purchasable | Low | Fixed: checkout rejects zero/absent price and insufficient stock |
| 7 | `models/Book.ts` | Regular indexes on `title` and `authors.name` only serve prefix matches, not "contains" search | Low | Accepted: escaped regex search for this catalogue size |
| 8 | Atlas network access | `0.0.0.0/0` is needed for Vercel but open to the internet | Medium | Accepted for now; restrict before production |

## Step 3: Catalogue data
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `models/Book.ts` / importer | `stock` defaults to 0, so all 1,000 imported books appeared out of stock | High | Fixed: `refresh:books` regenerated fields → 948 in stock, 52 out of stock |
| 2 | `scripts/importBooks.ts` | Gutendex has no price; inventing one silently would misrepresent data | Medium | Fixed: deterministic demo price/rating with `isDemoData: true`, documented in UI/admin |
| 3 | `scripts/importBooks.ts` | Duplicate imports could inflate the catalogue | High | Fixed: unique `sourceId` + upsert; exactly 1,000 records |
| 4 | Catalogue display | Author names are `"Last, First"` in Gutendex | Low | Fixed: `formatAuthorName` normalises to `"First Last"` |
| 5 | Atlas | Earlier casing created a duplicate `Books` collection with stale stock | Low | Open: app uses lowercase `books`; drop `Books` when convenient |

## Step 4: Authentication and security
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `lib/auth.ts` | Session must not be readable by JavaScript | Critical | Fixed: HTTP-only cookie, `sameSite=lax`, `secure` in production |
| 2 | `services/authService.ts` | Password change/reset must revoke old sessions | High | Fixed: `tokenVersion` claim compared on every request |
| 3 | `api/auth/google/*` | OAuth callback is CSRF-prone without state validation | High | Fixed: random state cookie, compared and cleared on callback |
| 4 | `api/auth/google/*` | Open redirect through `next` | High | Fixed: only same-site paths starting with a single `/` |
| 5 | `api/auth/*` | Credential stuffing | High | Fixed: fixed-window rate limit per IP + email; per-process only (see open items) |
| 6 | `services/authService.ts` | Google-only accounts must not be able to log in with an empty password | High | Fixed: provider check before bcrypt compare |
| 7 | `lib/security.ts` | Cross-site browser writes | Medium | Fixed: Origin/Host check plus `SameSite=Lax` |
| 8 | `services/authService.ts` | Email enumeration through password reset | Medium | Fixed: endpoint always returns the same generic response |
| 9 | `proxy.ts`, `components/auth/LoginClient.tsx`, `components/auth/SignupClient.tsx` | After login/signup, browser Back could return to `/login`/`/signup` for an authenticated user | Medium | Fixed: `/login` and `/signup` added to proxy matcher; authenticated sessions are redirected to a safe `next` path (default `/`); auth clients redirect when `auth.ready && auth.user` and use `router.replace(...)` after successful auth to replace the auth history entry |

## Step 5: API and data access
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `services/bookService.ts` | User-supplied search text in regex could cause ReDoS/injection | High | Fixed: `escapeRegex()` on every regex input |
| 2 | `validators/*` | Untrusted payloads reached services directly | High | Fixed: Zod validation on every request body/query |
| 3 | `api/books/route.ts` | In-memory slicing would not scale beyond one page | Medium | Fixed: DB-backed `skip`/`limit` + `countDocuments` |
| 4 | `api/books/route.ts` | Public catalogue responses were uncached | Medium | Fixed: `s-maxage=120, stale-while-revalidate=600` |
| 5 | `api/auth/*`, `api/cart/*` | Authenticated responses must never be cached | High | Fixed: `Cache-Control: no-store`, `Vary: Cookie` |
| 6 | `lib/apiError.ts` | Error responses could leak stack traces | Medium | Fixed: generic 500, Winston log server-side |
| 7 | `api/books/[id]/route.ts` | Detail page showed `0.0 (0)` because the empty reviews summary overrode the catalogue rating | Medium | Fixed: fall back to the book rating until real reviews exist |

## Step 6: Storefront UI
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `components/catalog/CatalogClient.tsx` | A generic template would not match the supplied XD screens | High | Fixed: rebuilt from XD geometry (tokens, 1018 px container, 60/50 px chrome, 12/page pagination) |
| 2 | `components/books/BookCover.tsx` | `unoptimized` shipped full-size third-party covers (~246 KB) | Medium | Fixed: Next image optimization + `sizes` + priority for page 1 (~120 KB, performance 64 → 98) |
| 3 | `globals.css` | Rating badge contrast was 4.11:1 at 10 px bold | Medium | Fixed: `#2E7D32` background → Lighthouse accessibility 100 |
| 4 | `components/books/BookCard.tsx` | Card title was `h3` under page `h1`, breaking heading order | Medium | Fixed: `h2` |
| 5 | `components/books/BookCard.tsx`, `SiteHeader.tsx` | Accessible names did not contain visible text on cover links/account menu | Medium | Fixed: removed redundant `aria-label`; menu label includes the visible first name |
| 6 | antd v6 usage | `Alert message`, Drawer `width`, `destroyOnClose` produced deprecation warnings | Low | Fixed: `title`, `size`, `destroyOnHidden`; `data-scroll-behavior="smooth"` |
| 7 | Auth screens | Auth card scrolled because inputs were 40 px instead of the XD 35 px | Low | Fixed: geometry corrected; no scrollbar at 727×425 |
| 8 | Auth illustration | XD `.agc` asset bytes are unavailable | Low | Accepted: CSS/SVG approximation; geometry/colors match |
| 9 | Auth backdrop | Dark gradient/grid did not match the XD screen | Low | Fixed: white page + 31% black overlay, `#f5f5f5` panel, caption 39 px from the bottom |

## Step 7: Cart, checkout and orders
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `services/orderService.ts` | Client-supplied prices/totals must never be trusted | Critical | Fixed: totals recomputed server-side from book and cart data |
| 2 | `services/orderService.ts` | Concurrent checkouts could oversell stock | High | Fixed: atomic `findOneAndUpdate` with `stock >= quantity` + rollback of earlier decrements |
| 3 | `models/Order.ts` | Orders must remain accurate after catalogue price edits | High | Fixed: immutable item snapshot, including `originalPrice` for the struck price |
| 4 | `services/cartService.ts` | Guest cart would be lost after login/signup | High | Fixed: Redux/localStorage guest cart merged server-side |
| 5 | `components/checkout/AddressFormModal.tsx` | Address dialog did not reset between add/edit attempts | Low | Fixed: `destroyOnHidden` + reset on open |
| 6 | `components/checkout/CartClient.tsx` | Successful orders stayed on the summary step | Medium | Fixed: redirect to `/orders/success?id=…` and invalidate cart/orders caches |

## Step 8: Admin
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `api/admin/*` | Hiding admin links is not authorization | Critical | Fixed: every admin handler checks role server-side |
| 2 | `app/admin/layout.tsx` | Admin pages could be indexed | Low | Fixed: `robots: { index: false, follow: false }` |
| 3 | `components/admin/AdminBooksClient.tsx` | Destructive delete without confirmation | Medium | Fixed: confirmation modal; caches invalidated after mutations |
| 4 | `services/adminBookService.ts` | Restocking should notify waiting customers | Medium | Fixed: `notifyStockAlerts()` queues stock-alert emails on stock increase |
| 5 | `admin/users` role editing | An admin could demote themselves or remove the last admin, locking the console | High | Fixed: self-change blocked in API + UI, last-admin guard, `tokenVersion` bump signs the user out |
| 6 | `components/admin/AdminBooksClient.tsx`, `AdminBookFormModal.tsx`, `app/admin/books/[id]` | Edit from the books list triggered modal/form lifecycle issues (reported as two errors) and was fragile with partial list-row data | Medium | Fixed: edit uses dedicated `/admin/books/[id]` page with `GET /api/admin/books/[id]`; form split into shared `AdminBookForm` with safe value mapping, `forceRender` modal mounting, and typed `NamePath` field errors |

## Step 9: Infrastructure and tooling
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `next.config.ts` | Missing browser hardening headers | Medium | Fixed: nosniff, DENY framing, referrer policy, permissions policy |
| 2 | `lib/logger.ts` | Unstructured console logs are hard to operate | Low | Fixed: Winston with levels |
| 3 | `lib/mailer.ts` | Missing SMTP must not break registration/checkout | Medium | Fixed: email job recorded as `skipped`; request continues |
| 4 | `lib/mailer.ts` | Emails are sent after the response via `after()` | Low | Fixed: does not block HTTP responses |
| 5 | `lib/security.ts` | In-memory rate limiting is not shared between instances | Medium | Open: move to Redis/Upstash before horizontal scaling |
| 6 | Tests | Only validators and money are unit-tested | Medium | Open: add API integration + Playwright E2E |
| 7 | CI / deployment | No workflow or deploy config; Sonar config never executed against a server | Medium | Open |
| 8 | `docs/architecture.md` | Described infinite scroll and a `/checkout` guard that no longer exist | Low | Fixed: documents numbered pagination + prefetch and the real routes |

## Open items (not defects in shipped flows)
1. Google OAuth live round-trip requires credentials; code paths are complete.
2. SMTP delivery requires credentials; queued jobs are `skipped` and not retried.
3. Replace the in-memory rate limiter with a shared store.
4. Add API integration and E2E tests, then a CI workflow.
5. Drop the stale `Books` collection and restrict Atlas network access.
6. Provide the original XD bitmap assets for the auth illustration if pixel-identical artwork is required.
