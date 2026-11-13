# Fundoo Books — Bookstore

A production-structured full-stack bookstore built with the Next.js App Router, MongoDB Atlas and Ant Design. The catalogue contains **1,000 unique Project Gutenberg books** imported from [Gutendex](https://gutendex.com/), with browsing, search, filters, wishlist, cart, cash-on-delivery checkout, order tracking and an admin console.

> **Demo pricing notice.** Gutendex publishes metadata only, never prices, stock or ratings. Those storefront fields are generated deterministically from the Gutenberg id and stored with `isDemoData: true` so nothing pretends Gutendex supplied them. Admins can edit any field.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Route Handlers, `proxy.ts` guards) |
| UI | React 19, TypeScript, Ant Design 6, Tailwind CSS 4, custom SCSS-like design tokens |
| Client state | Redux Toolkit (auth + guest cart) and TanStack Query (server cache) |
| HTTP | Axios service client with typed envelopes |
| Database | MongoDB Atlas via Mongoose 9 |
| Auth | JWT in an HTTP-only cookie (`jose`) + bcrypt, Google OAuth 2.0 |
| Email | Nodemailer + a queued `EmailJob` collection |
| Docs | OpenAPI 3 served at `/docs` (Swagger UI) and `/api/openapi` |
| Quality | ESLint, TypeScript, Vitest, SonarQube properties, Lighthouse script |

## Features

**Storefront**
- 22-screen Adobe XD design language: sticky header, catalogue with filters, book detail, auth, cart/checkout, orders, wishlist, account and admin.
- Catalogue is the default landing page and is fully browsable by guests.
- Search, category/author filters, price range, in-stock toggle, five sort orders, DB-backed pagination and IntersectionObserver infinite scroll with scroll-position restore.
- Book detail with description, metadata, reviews, related titles, wishlist and add-to-cart.
- Guest cart in Redux + `localStorage`; merged into the server cart after login/signup.
- Wishlist, saved addresses, order history and status timeline.
- Multi-step COD checkout with address CRUD and confirmation.
- All amounts formatted in INR through one `formatINR` helper.

**Accounts & security**
- Register, login, logout, forgot/reset password, profile update, password change.
- HTTP-only, same-site session cookie; `tokenVersion` invalidates old sessions after password changes.
- Server-side authorization on every protected Route Handler (the proxy is only an optimistic page guard).
- Same-host checks and rate limiting on mutating endpoints.
- Google OAuth login and account linking.
- Transactional email: welcome, login alert, password reset, password changed, order confirmation, back-in-stock.

**Admin console** (`/admin`)
- Dashboard with revenue, orders, books, customers, low stock and pending fulfilment.
- Catalogue CRUD with search, low-stock filter and pagination (add via modal; edit via `/admin/books/:id`).
- Order list with search/status filters, detail drawer and status updates (cancellation restores stock).
- Customer list with role/provider/joined/last-login columns.

## Quick start

```bash
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run import:books      # imports exactly 1,000 Gutendex books
npm run dev               # http://localhost:3000
```

Health check: `GET /api/health` → `{ "success": true, "db": "connected" }`.

## Environment variables

Values live in `.env` (or `.env.local`); both are ignored by Git. `.env.example` is committed.

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | Atlas connection string including the database name, e.g. `.../Bookstore?retryWrites=true&w=majority` |
| `MONGODB_URI` | Fallback | Accepted if `MONGO_URI` is unset |
| `MONGODB_DB_NAME` | No | Overrides the database name in the URI |
| `JWT_SECRET` | Yes | At least 32 characters. `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | No | Session lifetime, default `7d` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL, no trailing slash |
| `ADMIN_EMAILS` | No | Comma-separated emails auto-promoted to admin on register/login |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Enables Google sign-in |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | Enables real email delivery |

### MongoDB Atlas setup

1. Create a free cluster and a database user with a strong password.
2. Network Access → allow your current IP for development (and Vercel's IPs or `0.0.0.0/0` for deployment).
3. Connect → Drivers → copy the connection string, add `/Bookstore` before the `?`, and URL-encode special characters in the password.

## Commands

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run import:books` | Import/refresh exactly 1,000 Gutendex books |
| `npm run refresh:books` | Recompute derived price/stock/rating without calling Gutendex |
| `npm run make:admin -- you@example.com` | Promote an existing account to admin |
| `npm run lighthouse` | Desktop Lighthouse audit of a running server |

## Admin access

1. Register an account at `/signup`.
2. Promote it with `npm run make:admin -- you@example.com`, **or** add the email to `ADMIN_EMAILS` before registering/signing in with Google.
3. Sign in and open `/admin` from the account menu.

## Google OAuth setup

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Authorised JavaScript origin: `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`).
3. Authorised redirect URI: `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
4. Put the id/secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart the server.
5. The callback exchanges the code server-side, links/creates the user, and sets the same HTTP-only session cookie as email login.

If the variables are missing, the "Continue with Google" button reports that Google sign-in is not configured instead of failing silently.

## SMTP setup

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM`. Gmail requires an app password (2-Step Verification must be on). When SMTP is not configured, emails are recorded in the `EmailJob` collection with status `skipped` — registration, checkout and password flows still work locally. Password-reset links are only usable when the email actually reaches the user.

## Data import

`npm run import:books` fetches pages from Gutendex, de-duplicates by Gutenberg id, upserts in bulk and verifies the collection count. It refuses to follow URLs outside `gutendex.com`, retries transient failures and skips/recover failed pages. Re-running is safe (idempotent upsert by `sourceId`).

Import result is reported by the script itself: `Inserted … , updated …. Collection total: 1000` and `Verified: 1000 unique books in MongoDB`.

## API overview

| Area | Endpoints |
|---|---|
| Catalogue | `GET /api/books`, `GET /api/books/:id`, `GET /api/books/:id/related`, `GET /api/books/facets`, `GET/POST /api/books/:id/reviews` |
| Auth | `POST /api/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/google`, `/google/callback`; `GET /api/auth/me`; `PATCH /api/auth/profile` |
| Cart | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/:bookId`, `POST /api/cart/merge` |
| Wishlist | `GET/POST /api/wishlist`, `DELETE /api/wishlist/:bookId` |
| Addresses | `GET/POST /api/addresses`, `PATCH/DELETE /api/addresses/:id` |
| Orders | `GET/POST /api/orders`, `GET /api/orders/:id` |
| Alerts | `POST /api/stock-alerts` |
| Admin | `GET /api/admin/stats`, `GET/POST /api/admin/books`, `GET/PATCH/DELETE /api/admin/books/:id`, `GET /api/admin/orders`, `GET/PATCH /api/admin/orders/:id`, `GET /api/admin/users` |
| System | `GET /api/health`, `GET /api/openapi`, `GET /docs` |

## Testing and quality

```bash
npm run lint
npm run typecheck
npm test
```

- 36 Vitest unit tests cover INR formatting/shipping rules, deterministic demo data and every Zod validator (auth, address, cart, order, review, catalogue query).
- `sonar-project.properties` points SonarQube at `src`, excludes tests/build output and reads `coverage/lcov.info`. This is configuration only: no scanner dependency, script, or CI workflow is included yet. Generate the report with `npx vitest run --coverage --coverage.reporter=lcov`, then run `npx sonar-scanner` (or the Sonar Docker image) with `SONAR_TOKEN`/`SONAR_HOST_URL` set. See `docs/development-rationale.md` §19 for caveats.
- `npm run lighthouse` runs a desktop audit against `LIGHTHOUSE_URL` (default `http://localhost:3000`) using headless Chrome and writes JSON under `lighthouse-report/`.

## Deployment (Vercel)

1. Push the repository and import it into Vercel.
2. Add every required environment variable in Project Settings.
3. Use `NEXT_PUBLIC_APP_URL` with the production domain and add the matching Google redirect URI.
4. Allow Vercel egress in Atlas Network Access.
5. Deploy. Route Handlers run on the Node.js runtime (Mongoose + bcrypt + Nodemailer).

## Project structure

```
src/
  app/            App Router pages, layouts and Route Handlers
  components/     Feature UI (catalog, books, auth, checkout, orders, admin, profile)
  hooks/          TanStack Query hooks + unified cart hook
  lib/            env, db, auth, money, mailer, security, OpenAPI, logger
  models/         Mongoose models
  scripts/        Gutendex import, demo-field refresh, admin promotion
  services/       Business logic used by Route Handlers
  store/          Redux Toolkit store and slices
  types/          Shared client/server types
  validators/     Zod schemas
docs/             Architecture, build log, review log
scripts/          Lighthouse audit runner
```

## Docs

- [Architecture](docs/architecture.md)
- [Build log](docs/build-log.md)
- [Review log](docs/review-log.md)

## License

Educational project. Book metadata belongs to Project Gutenberg.
