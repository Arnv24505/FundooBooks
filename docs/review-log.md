# Review log

Every code snippet is reviewed (security, performance, correctness, maintainability) before it is given out. Findings are recorded per step.

## Step 1: Project setup and Git
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `.gitignore` | Default `.env*` rule also ignores `.env.example` | Medium | Fixed (`!.env.example`) |
| 2 | `.env.local` | Must never be committed (holds secrets) | Critical | Covered by `.gitignore`; verify with `git status` |

## Step 2: Backend foundation
| # | File | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `lib/db.ts` | Reconnecting on every request or hot reload exhausts Atlas connections | High | Fixed: connection cached on `globalThis` |
| 2 | `lib/db.ts` | A failed first connect would cache the rejected promise forever | High | Fixed: promise reset on failure |
| 3 | `lib/db.ts` | Throwing on missing `MONGODB_URI` at import time breaks `next build` | Medium | Fixed: checked inside `connectDB()` |
| 4 | `api/health/route.ts` | Returning the raw error could leak the Atlas host | Medium | Fixed: generic 503 to client, detail logged server-side |
| 5 | `models/Book.ts` | `isbn` must not be unique (many books have none) | Medium | Fixed: plain index |
| 6 | `models/Book.ts` | `stock` defaults to 0 and `price` has no default, so unpriced books must not be purchasable | Low | Accepted: enforce in cart/checkout services (Step 6) |
| 7 | `models/Book.ts` | Regular indexes on `title` and `authors.name` only serve prefix matches, not "contains" search | Low | Deferred: decide regex vs text index in the search step |
| 8 | Atlas Network Access | `0.0.0.0/0` is needed for Vercel but is open to the internet | Medium | Accepted for now; rely on a strong DB password, revisit before deploy |
