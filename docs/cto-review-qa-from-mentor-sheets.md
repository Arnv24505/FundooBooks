# Fundoo Books — CTO Review Q&A (Mapped from Mentor Excel Sheets)

This document prepares you for a **CTO-style project review** based on the two mentor sheets in `bookstore/`:
- `Senior_Frontend_Interview_QA.xlsx` (27 scenario questions: React/performance, architecture, security, testing, etc.)
- `Frontend_SceriobasedQA_Set2.xlsx` (57 scenario questions: JavaScript core, React, Next.js/SSR, performance, CSS/layout, browser/network, security, testing)

For each topic you get:
1. **Concepts explained simply** (for fundamentals you may not know yet)
2. **Project-mapped answer** (how Fundoo Books actually does it, with file pointers)
3. **Real-world example**
4. **CTO cross-question / trap** (what they’ll push on, and an honest answer)

> **Golden rule in a CTO review:** answer from *this codebase first* (“In this project…”), then give the general principle, then admit gaps and give the production improvement. Never claim you implemented something you didn’t.

---

## Fundoo Books — quick facts (say this confidently)

- **What:** Full-stack bookstore (Next.js 16 App Router, React 19, TypeScript, Ant Design 6, Tailwind/global CSS). 1,000 Project Gutenberg books imported from Gutendex. Browse/search/filter, auth, guest cart + merge, wishlist, addresses, COD checkout, order tracking, admin console.
- **Data tiers:** Client (Redux for auth/guest cart, TanStack Query for server state, Axios `/api`) → Server (Route Handlers: Zod validation, host/rate-limit/auth/role checks, services) → MongoDB Atlas via Mongoose.
- **Key honesty point:** Gutendex gives metadata, not prices/stock/ratings. Storefront fields are **deterministic demo data** from `sourceId`, stored with `isDemoData: true` (`src/lib/money.ts`, import/refresh scripts).
- **Auth:** JWT (`jose`, HS256) in `httpOnly`, `sameSite=lax` cookie `bookstore_session`; claims include `sub`, `role`, `tv` (`tokenVersion`). DB verifies token version on each request (`src/lib/auth.ts`).
- **Security boundary:** `src/proxy.ts` is **optimistic UX redirects only**. Every protected/admin Route Handler re-checks auth/role server-side.
- **Money:** whole INR; `formatINR`, `computeSummary`, shipping constants centralized in `src/lib/money.ts`. Server recomputes checkout totals; orders store immutable snapshots.

---

## Part A — JavaScript core concepts (Set 2 Q1–Q10)

### A1. Memory leaks and closures (Set 2 Q1)
**Concept (simple):** A *closure* is when a function “remembers” variables from the place it was created. That’s normal and useful. A *memory leak* happens when the app keeps references to things it no longer needs (DOM nodes, big arrays, timers, listeners), so the garbage collector can’t free memory. Over time the tab gets slower or crashes.

**Project mapping:** This is a React/Next.js app, so most UI listeners/timers live in `useEffect`. The safe pattern is cleanup: return a function that removes listeners/clears timers/aborts fetches. Example areas to mention: `AuthBootstrap` in `src/app/providers.tsx` uses a `cancelled` flag in an async effect (prevents setting state after unmount/navigation races) — similar mindset to leak/race prevention. Admin/data fetching is mostly TanStack Query, which manages request lifecycle.

**Real-world example:** A dashboard adds a `setInterval` to refresh prices every 5 seconds but never clears it when the user navigates away; every visit adds another interval, memory/CPU climb.

**CTO trap:** “Is a closure always bad?” — No. Leaks come from *unintended retention*. “How would you prove it?” — Heap snapshots before/after, compare detached DOM/listener counts, and check Performance/Memory timelines.

### A2. Event loop: sync vs microtasks vs macrotasks (Set 2 Q2)
**Concept (simple):** JavaScript runs one thing at a time on the *main thread*. Order: (1) current synchronous code finishes, (2) *microtasks* run (Promise `.then/catch/finally`, `await` continuation, `queueMicrotask`) until empty, (3) one *macrotask* runs (`setTimeout`, `setInterval`, I/O events, UI events), then browser may render, repeat.

**Project mapping:** You see async/await and Promises throughout (Axios calls, `queueEmail` scheduling, DB/service calls). Understanding microtasks explains why state updates after `await` don’t happen “inside” the same synchronous tick and why unhandled Promise rejections must be caught.

**Real-world example:** `setTimeout(fn, 0)` runs after Promise microtasks queued earlier in the same turn, so Promise continuations usually run before a 0ms timeout.

**CTO trap:** “Where does rendering fit?” — typically between macrotasks; starving the loop with endless microtasks can freeze UI. “Where is `requestAnimationFrame`?” — scheduled before paint in the rendering steps (browser-specific details aside; know it’s for visual updates).

### A3. Concurrency limit / promise pool (Set 2 Q3)
**Concept (simple):** `Promise.all` starts everything at once — bad if you fire 500 API calls and the server/rate limits collapse. A *concurrency pool* runs only N tasks at a time; when one finishes, start the next.

**Project mapping:** The Gutendex import (`npm run import:books`, `src/scripts/importBooks.ts`) pages through an external API and is designed to be retry-safe/idempotent (upsert by `sourceId`). That’s the right place to control request rate/retries rather than blasting requests.

**Real-world example:** Image processing service accepts 5 jobs per worker; a queue/pool prevents overload and uses backoff on 429/503.

**CTO trap:** “Promise.all vs allSettled?” — `all` fails fast on first rejection; `allSettled` lets you collect per-item outcomes (better for batch imports with partial failures).

### A4. Debounce vs throttle (Set 2 Q4)
**Concept (simple):** *Debounce* waits until the user stops triggering events for X ms (search box: query after typing pauses). *Throttle* allows at most one run per X ms (scroll/resize: regular sampling).

**Project mapping:** Catalogue uses URL-driven search/filters; the exact debounce implementation depends on component code, but the *correct* design is: don’t fire expensive requests per keystroke without control, and cancel stale requests (React Query’s query key per search term helps avoid showing out-of-order/stale intent; AbortController is the low-level tool).

**Real-world example:** Search-as-you-type — debounce 300ms; analytics scroll depth — throttle.

**CTO trap:** “In React, why can a naive debounce break?” — creating a new debounced function each render resets its timer; you need a stable function (`useMemo`/`useRef`) and cleanup on unmount.

### A5. Immutability / reference equality (Set 2 Q5)
**Concept (simple):** In React/Redux, updates are often detected by *reference* (`oldObj === newObj`?). If you mutate a nested object, the reference may stay the same and UI may not update correctly; it also makes bugs harder to trace. Create new objects/arrays for changed paths.

**Project mapping:** Redux Toolkit uses Immer internally (you can write “mutating” logic safely in reducers), which is why RTK reduces boilerplate. React Query cache updates and React state should still be treated immutably.

**Real-world example:** `state.user.name = 'x'` without copying state can fail shallow checks; `setUser({...state.user, name:'x'})` or RTK/Immer patterns are correct.

**CTO trap:** “Deep clone everything?” — no, too costly. Copy only the changed path (structural sharing). “JSON stringify clone?” — breaks Dates/undefined/functions/Map/Set.

### A6. Event delegation (Set 2 Q6)
**Concept (simple):** Instead of attaching a click handler to every row in a 10,000-row table, attach one handler to the table and inspect `event.target`/`closest(...)`. Uses *bubbling* (events travel up the DOM).

**Project mapping:** AntD tables/lists abstract much of this, but the concept matters for performance and dynamic rows. Admin books/orders tables (`src/components/admin/*`) render many rows — library/framework patterns avoid naive per-node handler explosions.

**Real-world example:** A product grid with “Add to cart” on every card — one delegated listener on the grid container.

**CTO trap:** “Which events don’t bubble?” — `focus/blur` don’t bubble (use `focusin/focusout` or capture). React’s event system normalizes behavior, but know native DOM basics.

### A7. Async error handling and retries (Set 2 Q7)
**Concept (simple):** Every Promise rejection should be handled. Classify errors (validation 4xx, auth 401/403, not found 404, conflict 409, server 5xx, network/timeout). Retry only when safe.

**Project mapping:** Axios client + `getApiErrorMessage`/field errors centralize UI handling. API routes use `ApiError`/`handleRouteError` and Zod (`details` for form fields). Authenticated responses use `no-store` patterns.

**Real-world example:** Checkout payment call — **never blindly retry a non-idempotent POST**; duplicates can charge twice. Use idempotency keys. Read GETs are safer to retry with backoff.

**CTO trap:** “Why is retrying POST dangerous?” — without idempotency, server may process it twice. “What’s an idempotency key?” — a client-generated unique key the server uses to dedupe retries.

### A8. `this`, prototypes, call/apply/bind (Set 2 Q8)
**Concept (simple):** In regular functions, `this` depends on *how* the function is called. `obj.method()` sets `this` to `obj`; a detached callback may lose it. Arrow functions capture `this` from surrounding scope. Prototypes are how JS objects inherit properties.

**Project mapping:** Most code uses functional React components, hooks, and modules — fewer `this` pitfalls than class-heavy code. Still useful when reading library code or debugging callbacks.

**Real-world example:** `setTimeout(user.sayHi, 1000)` passes the function reference; `this` may become `undefined`/global — fix with `() => user.sayHi()` or `bind`.

**CTO trap:** `call(thisArg, a, b)` vs `apply(thisArg, [a,b])` vs `bind(...)` returns a new function with bound `this`.

### A9. CJS vs ESM (Set 2 Q9)
**Concept (simple):** *CommonJS* (`require/module.exports`) is older Node style, dynamic. *ES Modules* (`import/export`) are the standard for browsers/bundlers, statically analyzable — enabling better *tree-shaking* (removing unused exports).

**Project mapping:** Next.js/TypeScript/modern bundling uses ESM-first workflows; dependencies vary. “`require is not defined` in browser” usually means a CJS-only path leaked to client bundling.

**Real-world example:** Replacing a heavy CJS-only lodash import with `lodash-es` or native methods can reduce bundle size.

**CTO trap:** “Why does ESM tree-shake better?” — static `import/export` lets bundlers prove what’s unused at build time.

### A10. Dates, time zones, UTC (Set 2 Q10)
**Concept (simple):** Store/transmit timestamps in **UTC/ISO 8601**. Convert to local time only for display. Parsing ambiguous date strings is inconsistent across environments. “Add 1 day” is not always +24h (DST).

**Project mapping:** `createdAt`/timestamps come from MongoDB/Mongoose defaults; UI formatting should use `Intl.DateTimeFormat` or a library consistently. Order dates/numbers are displayed in the UI — be careful not to invent locale rules ad hoc.

**Real-world example:** A COD delivery cutoff shown as “today 5 PM” must respect the user/store time zone; the database stores the instant in UTC.

**CTO trap:** “How show a meeting to 3 time zones?” — store one UTC instant, render three `Intl.DateTimeFormat` outputs with explicit `timeZone`s.

---

## Part B — React (Senior 1,4,7,14,18,20,26,27; Set 2 Q11–Q25)

### B1. Re-renders, profiling, memoization (Senior Q1, Q4)
**Concept (simple):** React re-renders components when state/props/context change (by reference/identity rules). Unnecessary re-renders waste CPU. Fix with evidence: profile first, then `React.memo`, `useMemo`, `useCallback`, context splitting, selector stores.

**Project mapping:** Uses TanStack Query (selector-like consumption via hooks/query results) and Redux for focused state — better than putting all API data into one giant Redux tree (Senior Q4). Providers wrap the app; keep provider values stable to avoid broad re-renders.

**Real-world example:** A dashboard with 50 widgets re-renders all widgets because root context value is a new object every render — memoize provider value or split contexts.

**CTO trap:** “When is `useMemo` harmful?” — premature memo adds complexity and memory; only use when profiling shows a real cost or referential stability is required.

### B2. State classification (Senior Q4)
**Concept (simple):** *Server state* (from API, can be stale) vs *UI state* (modal open) vs *form state* vs *URL state* (filters/page) vs *global client state* (auth/cart). Don’t store everything in Redux.

**Project mapping:** Exactly this split: **TanStack Query** = server state (books, cart, orders, admin). **Redux** = auth user + guest cart. **URL params** = catalogue search/filter/page. Forms use AntD/local patterns.

**Real-world example:** Filters in the URL let users share/bookmark `?search=tolstoy&page=2` and make back/forward work correctly.

**CTO trap:** “Optimistic updates?” — update UI/cache before server confirms, keep rollback path on error (React Query supports mutation patterns). Checkout/stock is sensitive — be careful not to “optimistically” claim stock you don’t have.

### B3. `useEffect`: infinite loops and stale closures (Set 2 Q11)
**Concept (simple):** `useEffect` runs after render when dependencies change. Bugs: (1) effect sets state that’s in deps → loop; (2) object/function deps recreated each render → effect reruns; (3) interval/callback captures old state (*stale closure*).

**Project mapping:** `AuthBootstrap` uses `let cancelled = false` and checks it in async flow — avoids state updates after unmount (a related safety issue). Prefer functional state updates or refs for latest values in timers/subscriptions.

**Real-world example:** `setInterval(() => setCount(count+1), 1000)` with `count` closed over stale value — fix with `setCount(c => c+1)`.

**CTO trap:** “When is `useEffect` the wrong tool?” — for deriving data during render, for handling user events (use event handlers), or for data fetching where a library (React Query) handles caching/races better.

### B4. Context re-renders (Set 2 Q12)
**Concept (simple):** All consumers re-render when the context *value* reference changes. A single giant context causes wide re-renders.

**Project mapping:** Providers compose AntD/Redux/Query. Redux uses subscriptions/selectors; Query uses hook-based subscriptions — both avoid the “one context value for everything” anti-pattern.

**Real-world example:** `{user, theme, cart, notifications}` in one context: changing cart re-renders theme-only components. Split contexts or use selector stores.

**CTO trap:** “Context vs state management library?” — Context is a transport mechanism; libraries add selectors, middleware patterns, devtools conventions, and update optimizations.

### B5. Custom hooks (Set 2 Q13)
**Concept (simple):** Custom hooks extract *stateful logic* (not UI) for reuse: `useDebounce`, `useFetch` patterns, `useLocalStorage`. Keep them single-purpose, typed, cleanup-safe, SSR-safe (`typeof window` checks when needed).

**Project mapping:** `src/hooks/` contains cart/admin/query hooks; `useCart` presents a unified interface for guest vs signed-in cart. This is the right abstraction boundary.

**Real-world example:** `useAdminBooks` encapsulates query keys/params and `keepPreviousData` behavior for pagination UX.

**CTO trap:** “Rules of Hooks?” — call hooks at top level of React functions, not in conditions/loops/nested functions; ensures stable hook order.

### B6. Concurrent features: transitions/deferred values (Set 2 Q14)
**Concept (simple):** React can mark some updates as non-urgent (`useTransition`, `useDeferredValue`) so typing/clicks stay responsive while expensive rendering catches up. Different from debounce (time-based) — concurrency is priority-based.

**Project mapping:** Not all projects need this; catalogue pagination is small (12/page). Mention as a scaling tool for large client-side filtering/rendering.

**Real-world example:** Filtering 20,000 rows on each keystroke — keep input responsive, defer list render, show `isPending` indicator.

**CTO trap:** “Transition vs debounce?” — debounce delays work; transition starts work but lets React interrupt/deprioritize it to keep UI responsive.

### B7. Error boundaries (Set 2 Q15)
**Concept (simple):** An *error boundary* is a React component that catches render/lifecycle errors in its child tree and shows fallback UI instead of a white screen. It **does not** catch errors in event handlers, async code (`setTimeout`, Promises) not handled during render, or server-side rendering errors — handle those with `try/catch` and logging.

**Project mapping:** Next.js/React apps benefit from route/section-level boundaries. Know the limitation — API failures in handlers are handled via UI error states/React Query `isError`, not render error boundaries.

**Real-world example:** One broken widget in a dashboard shouldn’t crash the whole page; wrap widgets in boundaries and report to monitoring.

**CTO trap:** “What errors aren’t caught?” — event handlers, async callbacks, SSR, errors thrown in the boundary itself.

### B8. Server vs Client Components, hydration (Set 2 Q16, Q23; Senior Q7)
**Concept (simple):** In App Router, *Server Components* run on the server, can access data/secrets safely, and send less JS to the browser. *Client Components* (`"use client"`) are needed for state, effects, event handlers, browser APIs. *Hydration* is React attaching event handlers to server-rendered HTML on the client — the first client render must match server HTML.

**Project mapping:** Many interactive pages/components are client components (AntD, hooks, Query/Redux). `layout.tsx` is server-side; `providers.tsx`/`AuthBootstrap` are client. Hydration mismatch causes: `Date.now()`, `Math.random()`, `window/localStorage` during render, locale differences. Fix by moving browser-only logic to `useEffect` or using deterministic rendering.

**Real-world example:** Rendering `new Date().toLocaleString()` on server and client can differ by time zone → mismatch warning; render a stable placeholder then update after mount if needed.

**CTO trap:** “Why `suppressHydrationWarning`?” — only for unavoidable, harmless differences (e.g., timestamps). Don’t use it to hide real bugs. “Cost of hydration?” — JS download/parse/execute + reconciliation; reduce with smaller client bundles and RSC where appropriate.

### B9. Forms and rendering cost (Set 2 Q17)
**Concept (simple):** Controlled inputs (`value` + `onChange`) update React state on every keystroke — fine for small forms, costly for 100 fields. Uncontrolled/ref-based forms (React Hook Form) read values when needed.

**Project mapping:** Uses AntD forms in auth/checkout/admin. Admin book edit was refactored into a shared form (`AdminBookForm`) with proper value mapping — correctness and lifecycle mattered more here than micro-optimizing 100 fields.

**Real-world example:** A long insurance form — use React Hook Form + per-step validation + memoized sections.

**CTO trap:** “Dynamic field arrays?” — use stable keys/field ids, library support (`useFieldArray`), avoid re-registering everything.

### B10. Keys and reconciliation (Set 2 Q18)
**Concept (simple):** `key` tells React which list item is which across renders. Using array index as key breaks when items reorder/delete — React may reuse the wrong component instance and preserve stale local state (e.g., wrong input text).

**Project mapping:** Books/orders/rows should use stable IDs (`_id`/`bookId`/`orderNumber`).

**Real-world example:** Delete row 2 in a todo list keyed by index — row 3 “moves up” and may keep row 2’s input state.

**CTO trap:** “Is index key ever OK?” — static, never reordered/inserted/deleted/filtered lists. Prefer stable IDs.

### B11. Reusable component APIs (Set 2 Q19)
**Concept (simple):** Compound components (`Tabs`, `Tabs.List`, `Tabs.Panel`) share state via context and give flexible composition. Support controlled/uncontrolled patterns and accessibility (ARIA roles, keyboard nav).

**Project mapping:** Uses AntD’s accessible primitives; custom components (header actions, book cards, admin forms) should follow predictable props/accessibility. The XD-aligned header uses semantic buttons/links and ARIA labels.

**Real-world example:** A custom dropdown must handle focus, Escape, outside click, `aria-expanded`, and not trap keyboard users.

**CTO trap:** “Compound components vs config props?” — config is simpler for fixed cases; compound components scale better for varied layouts.

### B12. Portals, modals, stacking context (Set 2 Q21, Q41)
**Concept (simple):** A *portal* renders React children into a different DOM node (often `body`) while keeping React tree behavior. Useful for modals/dropdowns escaping `overflow:hidden` or z-index/stacking contexts. *Stacking context*: certain CSS (`transform`, `opacity < 1`, `filter`, positioned+z-index, etc.) creates a local z-index world — a child can’t escape it.

**Project mapping:** AntD modals/drawers/popovers use layering patterns; earlier header logout had a Popconfirm/portal/outside-click issue and was fixed with a direct action path. Admin book edit moved to a dedicated page partly to avoid modal/form lifecycle issues.

**Real-world example:** Dropdown inside a `transform`ed sidebar appears behind main content despite `z-index:9999` — render overlay via portal or remove the stacking context.

**CTO trap:** “What creates a stacking context?” — `position` + `z-index` (not auto), `opacity < 1`, `transform`, `filter`, `will-change` in some cases, `isolation:isolate`, etc. (know the common ones.)

### B13. Legacy migration / upgrades (Set 2 Q20, Q25; Senior Q22)
**Concept (simple):** Avoid big-bang rewrites. Use *strangler fig*: replace routes/features incrementally, keep old and new running side by side, add characterization/E2E tests, migrate shared foundations (design system, API layer) early.

**Project mapping:** This project uses Next 16/React 19 — recent stack. `AGENTS.md` warns Next 16 has breaking changes and to consult bundled docs. Good review answer: read migration guides, run codemods, test baseline, upgrade dependencies in compatible order.

**Real-world example:** Migrating AngularJS checkout to React route-by-route behind the same domain; proxy routes to old/new apps until complete.

**CTO trap:** “How choose what to migrate first?” — high value, low risk, clear boundaries; or new features only in new stack.

---

## Part C — Next.js / SSR / BFF (Set 2 Q26–Q30)

### C1. App Router caching/revalidation (Set 2 Q26)
**Concept (simple):** Next.js can cache at multiple layers (request memoization, data cache, full route cache, client router cache — details vary by version/config). After mutations, you may need `revalidatePath`/`revalidateTag` or dynamic rendering to avoid stale data. User-specific data must not be cached publicly.

**Project mapping:** Route Handlers set cache headers intentionally (e.g., public catalogue with `s-maxage`/`stale-while-revalidate`; authenticated responses `no-store`/`Vary: Cookie`). Client freshness is handled by TanStack Query invalidation after mutations.

**Real-world example:** Admin updates a book price — invalidate `['books']`, `['book', id]`, facets; public CDN cache may still be stale until TTL/revalidation — acceptable for 2 minutes in this design, but explain tradeoff.

**CTO trap:** “How cache user-specific data safely?” — `Cache-Control: private/no-store`, vary on cookies, or avoid shared cache; never serve one user’s cart from a public CDN cache.

### C2. Protecting routes (Set 2 Q27)
**Concept (simple):** Authenticate/authorize on the server near data access. Middleware can do coarse redirects (fast) but shouldn’t be your only authorization. Never send protected data to the client and “hide it with CSS”.

**Project mapping:** `proxy.ts` redirects for UX; `requireUser()`/`requireAdmin()` and handler checks enforce real security. Admin layout `noindex`.

**Real-world example:** A “hidden” admin JSON endpoint without server checks is discoverable via Network tab/curl — always enforce on server.

**CTO trap:** “Middleware alone enough?” — No. It’s limited in where/how it runs and what it can safely do; treat data-access checks as mandatory in handlers/services.

### C3. ISR/on-demand revalidation (Set 2 Q28)
**Concept (simple):** *ISR* regenerates static pages after a time window. *On-demand revalidation* (webhook calls `revalidatePath/revalidateTag`) updates when CMS/data changes. First request after invalidation may trigger regeneration (behavior depends on config).

**Project mapping:** The storefront is dynamic/client-query driven in many places; catalogue API uses short public caching. Understand ISR as the Next.js solution if marketing pages become static.

**Real-world example:** CMS updates price — webhook hits secured endpoint with secret, revalidates `product-123` tag, CDN cache purged/updated as needed.

**CTO trap:** “Webhook security?” — verify secret/signature, validate payload, rate limit endpoint, log/audit.

### C4. BFF (Set 2 Q29)
**Concept (simple):** A *Backend-for-Frontend* is a server layer tailored to the UI: aggregates multiple services, hides secrets/tokens, shapes responses, reduces browser round trips.

**Project mapping:** Next Route Handlers + services already act as an app backend/BFF-like layer over MongoDB and external concerns (Gutendex import scripts, mailer). Browser calls only `/api`.

**Real-world example:** Mobile and web need different payloads — separate BFFs can optimize each without changing downstream microservices.

**CTO trap:** “BFF vs API gateway?” — gateway handles cross-cutting infra (routing, auth, rate limiting, TLS) for many clients/services; BFF is client-experience-oriented composition.

### C5. `next/image`, `next/font`, scripts (Set 2 Q30)
**Concept (simple):** `next/image` optimizes size/format/loading and helps prevent CLS when dimensions are known. `next/font` can self-host fonts and reduce layout shift. `next/script` controls loading strategy.

**Project mapping:** Book covers/images were optimized (sizes/priority patterns per build log). Know not to lazy-load or deprioritize the LCP hero image.

**Real-world example:** Large unoptimized hero image hurts LCP; missing width/height causes CLS when image loads.

**CTO trap:** “When not to use `priority`?” — only for above-the-fold/LCP-critical images; overusing it hurts performance.

---

## Part D — Performance & Web Vitals (Senior Q1,Q2; Set 2 Q34–Q42)

### D1. LCP, INP, CLS (Senior Q2, Q27, Q42)
**Concept (simple):** *LCP* = when main content becomes visible. *INP* = responsiveness to interactions (replaced FID as key metric). *CLS* = visual stability (layout jumps). Improve by optimizing critical images/fonts/CSS/JS, reducing main-thread work, and reserving space.

**Project mapping:** Lighthouse script and build-log metrics were recorded (strong desktop scores in a reported run). Image optimization, AntD/Next practices, and avoiding layout jumps matter. Catalogue prefetch improves perceived navigation speed.

**Real-world example:** Cookie banner inserted above content causes CLS — reserve space or overlay. A 4MB hero image delays LCP — compress, use AVIF/WebP, correct `sizes`, preload if critical.

**CTO trap:** “Lab vs field data?” — Lighthouse/lab is controlled; CrUX/RUM reflects real users/devices/networks and can differ.

### D2. Bundle/build optimization (Senior Q11)
**Concept (simple):** Analyze bundle, code-split routes, lazy-load heavy components, replace heavy deps, ensure ESM/tree-shaking. Measure before/after.

**Project mapping:** Next.js handles route-based splitting; AntD/tree-shaking depends on imports/build config. Know how to investigate if bundle grows.

**Real-world example:** Replace `moment` with `dayjs`/native `Intl`; lazy-load admin charts only on `/admin`.

**CTO trap:** “Why tree-shaking fails?” — CJS modules, side effects, importing entire library (`import _ from 'lodash'`), or misconfigured package exports.

### D3. Long tasks, workers, virtualization (Senior Q1; Set 2 Q16)
**Concept (simple):** Main thread does JS + rendering + input. Long tasks (>50ms) cause jank. Move heavy compute to *Web Workers*; virtualize long lists (render only visible rows).

**Project mapping:** 12 books/page avoids huge DOM lists. Admin tables can grow — AntD pagination/virtualization patterns are relevant at scale.

**Real-world example:** Parsing 50MB JSON on main thread freezes UI — parse/stream in a Worker or on the server.

**CTO trap:** “Microtask vs macrotask starvation?” — infinite Promise chaining can block rendering.

### D4. Caching headers, stale assets, chunk errors (Set 2 Q37, Q47)
**Concept (simple):** Hashed static assets (`app.abc123.js`) can be cached `immutable` for a year. HTML should revalidate so it references new hashes after deploy. Deployment skew can cause `ChunkLoadError` when old HTML asks for removed chunks.

**Project mapping:** API sets cache headers by data sensitivity (public catalogue vs `no-store` auth/admin). Next build outputs hashed assets.

**Real-world example:** After deploy, user’s tab has old HTML — dynamic import fails; catch error and prompt reload once (with loop guard), keep old chunks briefly on CDN.

**CTO trap:** `no-cache` means “revalidate before use”; `no-store` means “don’t store sensitive data”.

### D5. Fonts, images, third-party scripts (Set 2 Q34–Q36, Q38)
**Concept (simple):** Fonts cause FOIT/FOUT/CLS — use `font-display`, preload critical fonts, metric-compatible fallbacks. Third-party scripts (chat, analytics, A/B) often hurt INP/LCP — audit, defer, load on interaction, facade pattern.

**Project mapping:** Uses system/Roboto patterns per XD; AntD/Next add their own assets. Third-party scripts should be reviewed if added.

**Real-world example:** Heavy chat widget loads on page load — replace with a “Chat” button facade that loads the real widget on click.

**CTO trap:** “What’s a facade?” — a lightweight placeholder UI that defers loading expensive third-party code until user intent.

---

## Part E — CSS, layout, browser/network (Set 2 Q40–Q53)

### E1. Specificity, cascade layers, maintainability (Set 2 Q40, Q43)
**Concept (simple):** CSS applies by cascade: importance, origin, specificity, order. `!important` is a last resort. *Cascade layers* (`@layer`) let you define priority between reset/base/components/utilities. Scope styles (modules/BEM/utility discipline) to avoid leaks.

**Project mapping:** Uses global `globals.css` with XD tokens and component/utility-like classes plus Tailwind/AntD. Responsive hamburger/header behavior lives in CSS — good place to keep selectors intentional.

**Real-world example:** Library CSS overrides app CSS unpredictably — put library styles in a lower layer or wrap with controlled specificity.

**CTO trap:** “Do layers beat specificity?” — layers establish order between layers; within normal author styles, layer order can override specificity surprises, but understand the full cascade.

### E2. CORS (Set 2 Q45)
**Concept (simple):** CORS is a *browser* security rule. If `app.example.com` calls `api.other.com`, the *API server* must respond with headers (e.g., `Access-Control-Allow-Origin`) permitting it. You don’t “fix CORS in React code”.

**Project mapping:** App uses same-origin `/api` routes in Next.js — simple. OAuth/external calls happen server-side where appropriate.

**Real-world example:** Frontend `localhost:3000` calling `localhost:4000` fails until backend allows origin/methods/headers; preflight `OPTIONS` must succeed for non-simple requests.

**CTO trap:** “Can you use `*` with credentials?” — no. Credentialed requests require a specific allowed origin and `Access-Control-Allow-Credentials: true`.

### E3. Cookies, SameSite, iframes, same-origin vs same-site (Set 2 Q46; Senior Q5)
**Concept (simple):** *Same-origin* = scheme + host + port all match. *Same-site* is broader (registrable domain/eTLD+1 concept). `SameSite=Lax/Strict` restricts cross-site cookie sending (helps CSRF); `None; Secure` needed for cross-site contexts like some embeds — but third-party cookie restrictions are increasing.

**Project mapping:** Session cookie is `httpOnly`, `sameSite=lax`, `secure` in prod — good default for same-site app flows. Embedded iframe auth scenarios would need careful redesign.

**Real-world example:** Payment widget in an iframe on merchant site may not receive Lax cookies; modern solutions use redirects, token handoff with strict origin checks, or partitioned/approved storage patterns.

**CTO trap:** “Why did login fail in Safari iframe?” — intelligent tracking prevention/third-party cookie policies + SameSite behavior.

### E4. Critical Rendering Path, async/defer (Set 2 Q48)
**Concept (simple):** Browser parses HTML → builds DOM; parses CSS → CSSOM; combines into render tree → layout → paint → composite. Render-blocking CSS and parser-blocking JS delay first paint.

**Project mapping:** Next.js SSR/streaming patterns and optimized assets improve delivery. Know `async` (downloads parallel, executes when ready, can reorder) vs `defer` (downloads parallel, executes in order after parsing).

**Real-world example:** Put non-critical analytics `defer`/late; inline only critical CSS if needed; preload LCP image.

**CTO trap:** “CSS blocks rendering?” — yes, browser waits for CSSOM to avoid flash of unstyled/wrongly styled content.

### E5. Browser compatibility (Set 2 Q50)
**Concept (simple):** Define supported browsers (browserslist/analytics), use feature detection over UA sniffing, polyfill/transpile selectively, test in real engines (Chromium/Firefox/WebKit).

**Project mapping:** Modern Next 16/React 19 stack targets modern browsers; if enterprise requires older WebViews, you’d add explicit compatibility policy.

**Real-world example:** A CSS feature works in Chrome but not Safari — add fallback, `@supports`, or alternative layout.

**CTO trap:** “Why not UA sniffing?” — UAs are spoofed/inconsistent; feature detection tests actual capability.

---

## Part F — Security (Senior Q5, Q15; Set 2 Q51–Q54)

### F1. XSS and token storage (Senior Q5)
**Concept (simple):** *XSS* = attacker runs JS in your users’ browsers (stolen sessions, fake UI, data theft). Prevent by never injecting untrusted HTML (`dangerouslySetInnerHTML`/`innerHTML`), sanitizing if unavoidable, using CSP, and encoding output.

**Project mapping:** Uses React (escapes by default) and AntD; avoid unsafe HTML sinks. Session token in `httpOnly` cookie — JS can’t read it, which reduces damage from XSS compared to `localStorage` (but XSS is still critical due to CSRF-like authenticated actions/CSP gaps).

**Real-world example:** A product review renders `<img onerror=...>` from attacker — unsanitized HTML executes in other users’ sessions.

**CTO trap:** “localStorage risky even with CSP?” — CSP reduces injection vectors but misconfig, allowed domains, or JSONP-like gaps can fail; defense in depth favors `httpOnly` cookies + CSRF/origin protections.

### F2. CSP rollout (Set 2 Q51)
**Concept (simple):** *Content-Security-Policy* tells the browser which script/style/connect sources are allowed. Start in report-only mode, inventory violations, remove inline/eval patterns, use nonces/hashes, then enforce gradually.

**Project mapping:** Not fully detailed here as a strict CSP deployment; it’s a strong production hardening step.

**Real-world example:** Legacy inline `onclick` handlers break strict CSP — refactor to `addEventListener` and external scripts/nonces.

**CTO trap:** “What’s a nonce?” — a random per-response token; scripts with matching `nonce` are allowed, blocking injected scripts that don’t know it.

### F3. Clickjacking / iframe embedding (Set 2 Q52)
**Concept (simple):** *Clickjacking* overlays/tricks users into clicking hidden framed actions. Use `frame-ancestors` (CSP) / `X-Frame-Options` to prevent framing; if you must embed a widget, allowlist partner origins on a dedicated, low-risk route.

**Project mapping:** Standard web app — deny framing for sensitive areas in production unless required.

**Real-world example:** Bank “Transfer” button framed invisibly under a game’s “Click here” — user authorizes transfer.

**CTO trap:** “postMessage security?” — always check `event.origin` against an allowlist and validate message shape before acting.

### F4. Supply-chain attacks (Set 2 Q53)
**Concept (simple):** A compromised npm package can run malicious code during install/build or at runtime. Use lockfiles (`npm ci`), review deps, audit (`npm audit`/Snyk), pin versions, limit install scripts, and respond fast (rollback, rotate secrets if CI/build exposed).

**Project mapping:** `bookstore/package.json` + lockfile in repo workflow — in production, enable automated dependency alerts and CI checks.

**Real-world example:** A popular package publishes a hijacked version that exfiltrates env vars from CI — rotate tokens, rebuild from clean pinned version.

**CTO trap:** “Why are install scripts risky?” — they execute arbitrary code on developer/CI machines during `npm install`.

### F5. PII in logs/analytics (Set 2 Q54)
**Concept (simple):** Frontend is effectively public. Don’t log tokens, passwords, full card data, or unnecessary PII to console/analytics/error replay. Scrub/redact, mask inputs, minimize collection, honor consent.

**Project mapping:** API returns safe envelopes; never expose password hashes/raw reset tokens. Be careful not to put secrets in query strings.

**Real-world example:** Session replay captures typed passwords because inputs aren’t masked — compliance and security incident.

**CTO trap:** “Data deletion requests?” — frontend can trigger backend deletion/anonymization workflows and stop client-side tracking; actual deletion must be enforced server-side across systems/backups per policy.

---

## Part G — Testing, monitoring, release (Senior Q8,Q12,Q15,Q20,Q25; Set 2 Q55–Q57)

### G1. Testing strategy (Senior Q8; Set 2 Q56)
**Concept (simple):** *Testing trophy/pyramid idea:* many fast unit/integration tests, fewer E2E tests for critical flows. Test user behavior, not implementation details. Mock at boundaries (network/time), not your own internals.

**Project mapping:** Vitest covers money/deterministic demo data/validators (per build log). Gaps: API integration, Playwright/Cypress E2E, CI pipeline.

**Real-world example:** Login → add to cart → COD checkout → order visible — one E2E flow catches integration breaks that unit tests miss.

**CTO trap:** “When are snapshot tests bad?” — large brittle snapshots fail on harmless refactors and get blindly updated; prefer targeted assertions.

### G2. Debugging production (Senior Q12)
**Concept (simple):** Use error monitoring (Sentry/Datadog), source maps (uploaded securely, not public if sensitive), breadcrumbs/session replay, release/version tagging, correlation IDs with backend logs.

**Project mapping:** Winston logging exists server-side; client-side production observability would be an improvement.

**Real-world example:** 2% of Safari users get checkout error — stack trace + device/OS filter + release version points to a WebKit-specific API issue.

**CTO trap:** “Source maps publicly exposed?” — can reveal source; restrict access or use private upload/error-tracking integration.

### G3. Contract testing (Set 2 Q55)
**Concept (simple):** Frontend and backend agree on an API *contract*. Contract tests (e.g., Pact) or schema-generated types (OpenAPI/TS) catch breaking changes in CI before production.

**Project mapping:** OpenAPI (`/api/openapi`) + Swagger UI and consistent envelopes are a foundation; generated TS clients/diff checks would strengthen it.

**Real-world example:** Backend renames `orderNumber` to `id` — contract/schema diff or type generation breaks the build before deploy.

**CTO trap:** “Contract vs E2E?” — contracts catch interface/shape mismatches fast; E2E catches full user-flow regressions across real wiring.

### G4. Feature flags and safe rollout (Senior Q25)
**Concept (simple):** Decouple deploy from release. Roll out to 1% → 10% → 100%, monitor errors/conversion/latency, rollback quickly.

**Project mapping:** Not implemented as a flag system; good “production improvement” answer for risky checkout/admin changes.

**Real-world example:** New checkout UI increases payment failures on mobile — flag off for affected cohort in minutes without redeploy.

**CTO trap:** “How test flagged code?” — test both paths (on/off), default states, and flag removal/cleanup to avoid permanent complexity.

---

## Part H — Architecture, team/process (Senior Q3,Q10,Q20,Q21,Q26,Q27)

### H1. Micro-frontends (Senior Q3)
**Concept (simple):** Split one web app into independently built/deployed pieces by domain. Powerful for large orgs but adds runtime/operational complexity (shared deps, routing, auth, design consistency).

**Project mapping:** Single Next.js app — correct for this size/team. Monorepo/modular boundaries would come before micro-frontends.

**Real-world example:** Checkout team deploys weekly without blocking catalog team — but both must share auth/session and design system carefully.

**CTO trap:** “When NOT micro-frontends?” — small team, strong modular monolith works, or when coordination/duplication cost exceeds benefit.

### H2. Design system / consistency (Senior Q10)
**Concept (simple):** Shared tokens (colors/spacing/type), accessible primitives, documented components (Storybook), versioning, and governance prevent UI drift.

**Project mapping:** XD tokens/colors (`#A03037` brand, Roboto patterns) are reflected in `globals.css` and AntD theme config; `globals.css` centralizes much of the visual system.

**Real-world example:** Three teams build three different modals — unify on one accessible modal primitive with variants.

**CTO trap:** “Team needs unsupported variant?” — extend via documented API/composition first; fork only with ownership and plan to converge.

### H3. PR quality, deadlines, incidents (Senior Q20,Q21,Q27)
**Concept (simple):** Be pragmatic: block security/bugs/critical perf; pair on fixes; use feature flags/follow-up tickets. For deadlines, clarify goal, break scope, propose MVP/phases, be transparent about risk. For incidents: detect, communicate, mitigate, root cause, prevent recurrence.

**Project mapping:** Answer with STAR stories from your real work; if asked hypothetically, tie to this project (e.g., checkout stock bug, auth regression, stale deployment chunk).

**Real-world example:** Deadline in 2 weeks, estimate 6 — ship COD “happy path” MVP behind flag, defer address-book edge cases to phase 2, add monitoring.

**CTO trap:** “Tell me about a time you pushed back.” — show data, options, user impact, and respectful collaboration (not just refusal).

---

## Part I — Topics in sheets less central to this project (answer honestly)

- **Angular/RxJS, NgZone, signals** (Set 2 Q31,32): “This project uses React/Next.js. I understand the concepts at a high level: Angular uses change detection/zone mechanisms and RxJS streams (`switchMap` cancels stale requests — useful for typeahead). In React I’d solve similar problems with AbortController, React Query, or state transitions.”
- **Vue/Svelte selection** (Set 2 Q33): evaluate requirements, team skills, ecosystem, longevity, POC.
- **PWA/offline/background sync** (Senior Q24): not implemented; explain service worker caching strategies, IndexedDB queue, idempotency for replay.
- **Native app/monorepo-at-scale for 50 devs** (Senior Q26): discuss Nx/Turborepo, module boundaries, lint rules, shared libs — good future scaling answer.

---

## Final 60-second close (if CTO asks “anything else?”)

“I built Fundoo Books as a full-stack Next.js App Router app with a clear boundary: Route Handlers validate and enforce auth, services hold business rules, MongoDB/Mongoose persist data. I’m careful about security basics — `httpOnly` cookie sessions with `tokenVersion`, server-side authorization, and server-computed checkout totals with atomic stock updates. I also know the current tradeoffs: in-memory rate limiting, best-effort email via `after()`, and demo commerce data — and I can explain how I’d productionize each.” 

Use this file with `docs/project-review-guide.md` and `docs/development-rationale.md` for quick refresh before the review.