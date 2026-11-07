# Build log

One entry per step: what was built, files touched, how it was checked.

## Step 1: Project setup and Git
Status: done (run result not reported; confirm `npm run dev` and `npm run lint` pass)
- Next.js app created with TypeScript, ESLint, Tailwind, App Router, `src/` dir, `@/*` alias
- `.gitignore` extended with `!.env.example`
- `.env.example` created; `.env.local` ignored
- First commit pushed to `main`

## Step 2: Backend foundation
Status: in progress
Files:
- `src/lib/db.ts`: cached Mongoose connection (`connectDB`)
- `src/models/Book.ts`: Book schema and indexes
- `src/app/api/health/route.ts`: DB connectivity check
- `.env.local`: `MONGODB_URI` filled in

Checks (to be run by you):
- [ ] `npm run lint` and `npx tsc --noEmit` pass
- [ ] `GET /api/health` returns `{"success":true,"db":"connected"}`
- [ ] Atlas shows a `books` collection with the expected indexes after first use
