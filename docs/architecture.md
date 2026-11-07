# Architecture

## Goal
Browse, buy and track books. Catalog data comes from Gutendex (metadata only); price, stock and ratings are storefront fields managed by the admin or marked demo data.

## Three tiers
1. **Client**: Next.js + React, Redux Toolkit, Axios services.
2. **Server**: Next.js Route Handlers. Flow: Route -> middleware -> controller -> service -> Mongoose.
3. **Database**: MongoDB Atlas.

## Decisions
| Decision | Why |
|---|---|
| MongoDB Atlas, not local mongod | Same DB in dev and on Vercel |
| Tailwind for styling | One flag in create-next-app, no extra config |
| Business logic in services, not controllers | Keeps routes thin and testable |

_Updated as each step lands._

## Database connection
`connectDB()` in `src/lib/db.ts` caches the Mongoose connection on `globalThis`, so dev hot reloads and serverless invocations reuse one pool (max 10) instead of opening new connections.

## Book model
Gutendex fields (`sourceId`, `title`, `authors`, `subjects`, `languages`, `formats`, `downloadCount`, `coverImage`) are separate from storefront fields (`price`, `originalPrice`, `stock`, `rating`, `reviewCount`, `publisher`, `isbn`, `description`), which are optional and admin-managed or marked demo data.

Indexes: `sourceId` (unique), `isbn`, `title`, `authors.name`, `subjects`.
