---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build a complete Ganesh Mandal Management & Accounting application (adapted from Flutter/Firebase spec to the Next.js 16 + Prisma/SQLite stack available in this environment).

Work Log:
- Defined Prisma schema (User, Mandal, Festival, Transaction) with SQLite and pushed to db/custom.db.
- Installed bcryptjs + html-to-image; configured NextAuth v4 (credentials provider, JWT, bcrypt password hashing).
- Built core lib: session helpers (requireAdmin/requireAdminWithMandal), API client, currency/date formatters, constants (income/expense categories, payment modes), Zustand app store (view/flow/activeFestival/refreshKey), TanStack Query + SessionProvider, festive saffron/maroon theme in globals.css.
- Built API routes: /api/seed (bootstrap admin), /api/me, /api/reset-password, /api/mandal (GET/POST/PATCH), /api/festivals + /[id], /api/transactions (GET filtered + POST with auto receipt numbering) + /[id] DELETE, /api/reports (aggregations + chart data), /api/upload (multipart to /public/uploads).
- Built the single-route SPA shell (page.tsx -> AppRoot -> useSession gate -> AuthScreen / AppShell). AppShell has festive header, festival switcher, bottom nav (Dashboard/Entries/Add/Reports/Settings) with elevated center Add button + Add Income/Expense menu, and full-screen income/expense flow overlays.
- Implemented all screens: Login + Forgot Password (with seed bootstrap), Onboarding (Create Mandal + auto first festival), Dashboard (balance hero + 3 summary cards + recent entries), Income flow (4 steps + SlideToConfirm + Receipt), Expense flow (4 steps + camera/gallery bill upload + SlideToConfirm + success), Receipt screen (html-to-image Save Image/Share/Done, exact spec content), Entries (summary tiles + All/Income/Expense/Cash/UPI chips + search + date range), Reports (Income/Expense by Category, Cash vs UPI pie, Daily Collection area, Monthly bar), Festival Management (create/activate/close + per-festival isolated stats via Manage Festivals entry in switcher), Settings (Mandal details + logo upload + Receipt settings with prefix + auto-increment preview).
- SlideToConfirm widget uses pointer events (works with real touch/mouse); verified end-to-end via Agent Browser.
- Fixed bugs found during verification: FestivalSwitcher was not passed `me` prop (showed "No festival"), duplicate year in festival labels (added shared `festivalLabel`), income save did not bump refresh key (dashboard stale), "Clear filters" now also clears search, added Manage Festivals entry point, added DialogDescription for a11y.

Stage Summary:
- App fully working end-to-end, verified with Agent Browser at mobile viewport 390x844:
  - Login with seeded admin (admin@mandal.in / admin123) -> Onboarding -> Dashboard.
  - Income flow produced receipt GM-0001..GM-0003 with exact content (Shree Ganesh, Mandal, Ganesh Utsav 2026, Receipt No, Date, Received from, For, Amount, Thank You, Ganpati Bappa Morya!). Save Image/share rendered via html-to-image (no console errors).
  - Balance auto-updates: ₹5,500 income then ₹4,500 after ₹1,000 expense.
  - Entries search/filter, Reports charts, Festival creation + switching + isolation (Navratri 2026 shows ₹0), Settings tabs all verified.
- Lint clean; dev log shows only 200 responses, no runtime errors.
- Tech adaptation note: the requested Flutter+Firebase/MongoDB stack is not available here, so the app is implemented as a production-ready Next.js 16 mobile-first PWA using Prisma+SQLite (database), NextAuth credentials (auth), local /public/uploads (file storage, replaces Firebase Storage), html-to-image (receipt image), recharts (reports). Security is enforced server-side: every API route uses requireAdmin / requireAdminWithMandal, so only authenticated admins access their own mandal's data — mirroring the Firebase Security Rules requirement at the API/DB layer.
- Default admin credentials (auto-seeded on first visit): admin@mandal.in / admin123.
