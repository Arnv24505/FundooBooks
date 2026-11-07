# Bookstore

Full-stack online bookstore. Catalog of 1,000 Project Gutenberg books (via Gutendex) stored in MongoDB Atlas, with cart, wishlist, checkout (COD) and orders.

**Stack:** Next.js (App Router), React, TypeScript, Ant Design, Tailwind, Redux Toolkit, Axios, Mongoose, MongoDB Atlas, JWT, Winston, Swagger. Deployed on Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and JWT_SECRET
npm run dev                  # http://localhost:3000
```

## Environment variables

See `.env.example`. Real values live only in `.env.local` (never committed).

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string, including database name (`/bookstore`) |
| `JWT_SECRET` | Signs auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app |

### MongoDB Atlas setup
1. Create a free cluster.
2. Database Access: create a user with a strong password.
3. Network Access: allow your current IP for development.
4. Connect > Drivers: copy the connection string, add `/bookstore` before the `?`, and URL-encode special characters in the password.

Health check: `GET /api/health`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Docs

- [Architecture](docs/architecture.md)
- [Build log](docs/build-log.md): what was built, step by step
- [Review log](docs/review-log.md): code-review findings and fixes

_Sections are added here as each step is built._
