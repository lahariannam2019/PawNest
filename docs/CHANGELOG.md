# Changelog

All notable changes to the PawNest platform will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and conventional commits.

## [Phase 8: Dashboard Unification & Notifications] - 2026-10-15
### Added
- **Database-Driven Dashboard Overview API (`apps/api/src/modules/dashboard`):**
  - `GET /dashboard/summary`: Single authoritative endpoint returning user profile glance, accurate database counts (`petsCount`, `activeBookingsCount`, `completedBookingsCount`, `activeOrdersCount`, `unreadNotificationsCount`, `favouritesCount`), upcoming bookings, recent orders, companions carousel with vaccination statuses/reminders, recent notifications, and chronologically merged unified timeline events across Grooming (`GROOMING`), Boarding (`BOARDING`), Veterinary Consultations (`VET`), and Supply Orders (`SUPPLIES`).
- **Favourites Persistence & Management API (`apps/api/src/modules/favourites`):**
  - Updated Prisma schema with polymorphic relations (`Favourite` relates to `Provider` and `Product`).
  - `GET /me/favourites`: Fetch full user saved favourites with populated provider and product summaries.
  - `GET /me/favourites/ids`: Quick lookup set for client-side active heart status.
  - `POST /me/favourites`: Toggle favourite item with `ToggleFavouriteSchema`.
  - `PUT /me/favourites/:kind/:id` & `DELETE /me/favourites/:kind/:id`: Explicit idempotent endpoints.
- **Notification Centre & Rolling-Window Deduplication (`apps/api/src/modules/notifications`):**
  - `GET /notifications`: Paginated in-app notification list supporting `unreadOnly` filter.
  - `POST /notifications/:id/read`: Mark single notification as read.
  - `POST /notifications/read-all`: Mark all notifications as read atomically.
  - `createNotificationSafely` Helper: Deduplicates repetitive notifications across rolling time windows (default 24h) to avoid spamming pet parents with duplicate vaccination or booking status alerts.
- **Authoritative Review Eligibility Subsystem (`apps/api/src/modules/reviews`):**
  - `GET /me/reviewable`: Returns list of past completed bookings eligible for review.
  - `POST /providers/:slug/reviews`: Enforces strict Section 17 business rules:
    - Verifies booking exists and belongs to the authenticated user (`404` if not found).
    - Verifies booking status is strictly `COMPLETED` (`422 BOOKING_NOT_COMPLETED` for `PENDING`, `CONFIRMED`, `CANCELLED`).
    - Verifies no existing review exists for the booking (`409 ALREADY_REVIEWED`).
    - Atomically updates aggregate provider review ratings (`ratingAvg`, `ratingCount`).
    - Dispatches celebratory in-app notification using `createNotificationSafely`.
  - `PATCH /admin/bookings/:id/status`: Admin route for testing and advancing booking status lifecycle.
- **Frontend Dashboard Redesign & Components (`apps/web`):**
  - Overview Workspace (`/dashboard`): Greeting banner, quick 4-metric counter grid, vaccination reminder alert banner, completed visit review prompt banner, quick care actions, filterable unified timeline (All, Appointments, Stays, Orders), and companions carousel.
  - Saved Favourites Page (`/dashboard/favourites`): Multi-tab viewer (All, Providers, Supplies) with direct removal, live toggle, and empty state illustrations.
  - Notification Popover (`NotificationBell`): Interactive top-bar bell with live unread counter badge, mark-all-as-read button, and item click-to-read transition.
  - Review Modal (`ReviewModal`): Elegant 1–5 star rating selector, title, reflection body, and server-side validation feedback.
  - Booking Detail Page Integration (`/dashboard/bookings/[id]`): Shows `COMPLETED` status badge and "Leave Reflection" trigger opening `ReviewModal` for completed visits; locks cancellation/rescheduling.
  - Heart Button Integration (`FavouriteButton`): Added to `ProviderCard`, `ProductCard`, and provider/product detail pages (`grooming/[slug]`, `boarding/[slug]`, `vet/[slug]`, `supplies/p/[slug]`) with optimistic updates and event propagation control.
- **Comprehensive Automated Test Suite (`apps/api/src/modules/dashboard/dashboard.test.ts`):**
  - 16 end-to-end integration tests covering dashboard counts, timeline aggregation & ordering, favourites toggle/list/delete, notification mark-read/read-all/deduplication, review eligibility rejection on pending/confirmed bookings, review duplicate rejection, cross-user isolation, and rating recalculation.

### Verified
- **Monorepo Test Suite:** 102/102 backend tests passing (including 16 Phase 8 dashboard tests, Phase 7 concurrency locks & webhooks, Phase 6 vet triage & pg-boss reminders, Phase 5 boarding transactions, Phase 4 grooming availability). 16/16 frontend unit tests passing. Total: 118 passing tests.
- **Monorepo Typecheck:** `pnpm -r typecheck` passed with 0 errors across `@pawnest/shared`, `@pawnest/api`, and `@pawnest/web`.
- **Production Build:** `next build` succeeded with 25/25 static and dynamic routes compiled without errors.

---

## [Phase 7: Supplies, Cart, Checkout & Orders] - 2026-10-15
### Added
- **Product Catalogue, Variants & Seed Dataset (`apps/api/prisma/seed`):**
  - Seeded 8 core pet supply categories per Appendix B (`food`, `treats`, `beds`, `collars-leashes`, `bowls-feeders`, `grooming-tools`, `toys`, `wellness-supplements`).
  - Seeded 18 realistic, artisanal products with ~45 multi-tier variants (size, weight, flavour), full specifications, materials, and ingredients.
  - Realistic inventory levels seeded with low-stock warnings ($\le 5$) and an out-of-stock item (`canine-cognition-botanical-drops`, 0 stock) for testing empty-stock constraints.
  - Seeded verified customer reviews tagged `isSample=true` and product badges tagged `isDemo=true`.
  - Pre-seeded realistic demo historical order (`PN-ORD-SEED01`) for `demoUser`.
- **Catalogue & Search API Endpoints (`apps/api/src/modules/products`):**
  - `GET /categories`: Categories list with active product count.
  - `GET /products`: Multi-filter search supporting category, species (`DOG`, `CAT`, `ALL`), search query `q`, stock status (`inStock=true`), sorting (`featured`, `price-asc`, `price-desc`, `rating`), and cursor pagination.
  - `GET /products/:slug`: Comprehensive product detail with variants, specs, and review statistics.
  - `GET /products/:slug/reviews` & `POST /products/:slug/reviews`: Customer product reviews with ratings, helpfulness counters, and purchase verification.
- **Cart Subsystem (`apps/api/src/modules/cart`):**
  - `GET /cart`: Full server-side computed cart summary (subtotal, shipping, 8.875% NYC tax, total, and free shipping progress).
  - `POST /cart/items`: Add variant with server-side stock clamp (1–20) and max 50 line enforcement.
  - `PATCH /cart/items/:id`: Change quantity with stock limit check.
  - `DELETE /cart/items/:id`: Item removal.
  - `POST /cart/merge`: Atomic reconciliation of anonymous guest cart items into authenticated user cart upon login.
- **Stock Reservation, Concurrency Protection & Checkout Pipeline (`apps/api/src/modules/orders`):**
  - `POST /checkout/session`: Authoritative server re-quote; detects price changes (`409 CART_CHANGED`).
  - Transactional Advisory Locking: Acquires `pg_advisory_xact_lock(hashtext('variant_stock:' || variantId))` sorted by ID inside serializable transaction to prevent overselling under high concurrency.
  - 15-minute reservation window with automatic background recovery job (`expireOldReservations`).
  - Pluggable payment provider architecture (`PaymentProvider`):
    - `DemoPaymentProvider`: Safe local testing setting `status: 'DEMO_PLACED'` and `paymentMode: 'DEMO'` (strictly never marked as real `paid`).
    - `StripePaymentProvider`: Creates Stripe Checkout Session and verifies incoming webhooks.
  - `POST /checkout/demo/confirm`: Finalizes demo checkout, converts reservation to permanent order items, and empties cart.
  - `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`: User order tracking, timeline, and order cancellation with automatic stock restocking.
  - `PATCH /admin/orders/:id/status`: Admin status lifecycle transition (`PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- **Frontend Supplies Shopping Experience (`apps/web`):**
  - Unified `CartContext`: Manages server-synced cart for authenticated users and local storage cart for guests, with auto-merge on login.
  - Global `CartDrawer`: Slide-over drawer with $75 free shipping threshold bar, line items stepper, price breakdown, and checkout CTA.
  - Product Catalogue (`/supplies`): Filter bar with category pills, species toggle, in-stock checkbox, sort selector, and search input.
  - Product Detail Page (`/supplies/p/[slug]`): Interactive variant selector, stock level indicator, delivery estimate, specifications/ingredients tabs, and sample customer reflections.
  - 3D Interactive Product Viewer (`ProductViewer3D`): 360-degree interactive mouse/touch drag rotation with graceful static image fallback.
  - Dedicated Cart Page (`/cart`): Full-page table layout with quantity controls, item removal, and order summary.
  - Multi-Step Checkout (`/checkout`): Shipping address form, payment method selector (Demo vs Stripe), price conflict resolution, and demo order confirmation modal.
  - Customer Order History & Detail (`/dashboard/orders` & `/dashboard/orders/[id]`): Order list with status badges, delivery timeline, line items, address, and cancellation capability.

### Verified
- **Concurrency Test (`orders.test.ts`):** 25 simultaneous parallel checkout requests competing for the single last remaining stock unit; **exactly 1 succeeds (201) and 24 fail with 409 (`SLOT_TAKEN`)**; zero overselling verified in database.
- **Price Drift Protection:** Verified that altering variant price in database immediately triggers `409 Conflict` (`CART_CHANGED`) during checkout creation.
- **Stock Reservation Expiry:** Verified that `expireOldReservations()` safely unreserves inventory after 15 minutes.
- **Demo Order Payment Integrity:** Verified demo checkouts strictly save `status: 'DEMO_PLACED'` with `paymentMode: 'DEMO'`.
- **Order Cancellation Restock:** Cancelling an order restores variant stock levels.
- **Complete Test Suite:** 20/20 new order tests passing; 85/85 API tests passing across entire monorepo.
- **Typecheck & Production Build:** Monorepo typecheck passed cleanly with 0 errors (`pnpm -r typecheck`).

---

## [Phase 6: Veterinary Appointments & Medical Records] - 2026-10-14
### Added
- **Veterinary Providers & Seed Dataset (`apps/api/prisma/seed`):**
  - Seeded 5 accredited veterinary clinics across NYC per Appendix B (Hudson River Veterinary Hospital, Brooklyn Heights Animal Medical Centre, Central Park West Veterinary Clinic, Prospect Heights Veterinary Atelier, and Astoria Veterinary Specialists & Wellness).
  - Seeded primary care services (Wellness & Preventive Exam, Core Vaccinations & Boosters, Sick Pet Consultation, Dental Examination, Post-Treatment Follow-up) and diagnostic add-ons (Fecal/Parasite Screens, Complete Blood Panels, Microchipping).
  - Seeded clinic operating hours (Mon-Sat 08:30-18:00 with 2 exam stations, Sun 10:00-15:00 with 1 station) and verified patient reviews tagged `isSample=true`.
  - Pre-seeded realistic demo veterinary records (`PN-VET-SEED01`, `PN-VET-SEED02`) for Barnaby and Luna.
- **Public Visit Types, Symptoms & Disclaimer Discovery (`apps/api/src/modules/providers`):**
  - Implemented `GET /api/v1/vet/visit-types` returning standard clinical visit types (`WELLNESS`, `VACCINATION`, `SICK_PET`, `DENTAL`, `FOLLOW_UP`), species-specific triage symptom options for dogs and cats, and the official non-emergency medical disclaimer.
- **Transactional Veterinary Booking Pipeline (`apps/api/src/modules/bookings`):**
  - `POST /bookings/quote`: Added authoritative quotes for `kind: 'VET'`, computing consultation base fee and diagnostic add-ons with species verification.
  - `POST /bookings`: Atomic appointment creation with `PN-VET-` reference prefix, `Idempotency-Key` replay safety, advisory locking on doctor exam stations, pet ownership validation, and storage of `visitType`, `symptoms`, `reason`, and `emergencyAcknowledged`.
  - Medical Safety Enforcement: Server strictly rejects appointments without explicit `emergencyAcknowledged: true` (422 `VALIDATION_FAILED`), preventing unauthorized emergency use.
- **Background Appointment Reminders with `pg-boss` (`apps/api/src/jobs/reminders`):**
  - Integrated `pg-boss` v12 background worker backed by PostgreSQL.
  - Automatically schedules a reminder job 24 hours prior to appointment `startsAt`.
  - Exactly-once delivery guarantee: atomic transaction updates `reminderSentAt DateTime?` on the booking and dedupes on the `Notification` table, preventing duplicate alerts or emails under parallel job runs.
  - Integrated console mail provider sending patient and clinic appointment particulars to the pet owner.
- **Frontend Veterinary Experience (`apps/web`):**
  - Veterinary Discovery Page (`/vet`): Prominent persistent emergency triage banner, filters for species, city, and ratings, accredited clinic cards, and clinical standards highlights (fear-free handling, in-house lab, complete medical record sync).
  - Clinic Detail Page (`/vet/[slug]`): Comprehensive clinic view with persistent emergency medical disclaimer, examination care menu, diagnostic add-on cards, doctor clinic schedule, and patient reviews.
  - Veterinary Booking Wizard (`/book/vet/[providerSlug]`):
    1. Patient Selection with medical context pre-fill (allergies, chronic conditions, active medications, recent vaccinations).
    2. Consultation Type & Preparatory Triage (visit type selector, species-tailored symptom checklist, primary reason textarea, and clear non-diagnostic safety advisory banner).
    3. Doctor Exam Slot Picker (real-time slot availability from clinic operating hours).
    4. Review, Mandatory Emergency Care Disclaimer Checkbox, and Instant Confirmation.
  - Dashboard Integration (`/dashboard/bookings` & `/dashboard/bookings/[id]`):
    - Distinctive `Veterinary Visit` badge and visit category indicator in appointments list.
    - Clinical Intake & Triage card on booking detail displaying reported symptoms, consultation notes, and verified non-emergency care acknowledgement badge.

### Verified
- **API Tests (`vet.test.ts`):** 9/9 automated tests passing:
  - Visit types and emergency disclaimer verification via `GET /vet/visit-types`.
  - Authoritative quote calculation for wellness exam and diagnostic add-on.
  - Rejection with 422 when `emergencyAcknowledged: false`.
  - Rejection with 404 when attempting to book another user's pet.
  - Successful appointment creation with `PN-VET-` reference prefix, intake persistence, and station locking.
  - Idempotency key replay test returning cached booking response.
  - Cross-user authorization isolation returning 404.
  - Reminder job exactly-once delivery test: initial run marks `reminderSentAt` and delivers 1 notification; second invocation safely aborts without duplicate notifications.
- **Complete Monorepo Test Suite:** 81/81 automated tests passing across `apps/api` (65) and `apps/web` (16).
- **Typecheck & Production Build:** Clean monorepo typecheck (`pnpm -r typecheck`); Next.js production build succeeded with 25 static and dynamic pages.

---

## [Phase 5: Boarding & Multi-Day Stays] - 2026-10-14
### Added
- **Boarding Providers, Suites & Seed Data (`apps/api/prisma/seed`):**
  - Seed database populated per Appendix B with 5 luxury pet retreats across New York (Meadowbrook Estate, Urban Haven Boarding DUMBO, Whispering Pines Country Retreat, Greenwich Village Feline & Canine Oasis, and Prospect Park Respite).
  - Seeded suites/units with distinct capacities, nightly pricing ($85 - $165/night), pet sizes, species, and luxury amenities (soundproofing, webcams, climate control, outdoor runs).
  - Pre-seeded test pets: fully vaccinated demo pet `Luna` (up-to-date Rabies, DHPP, Bordetella) and vaccine-restricted pets `Barnaby` (expired Rabies), `Mochi` (missing Bordetella), and `Cleo` (missing FVRCP).
  - Seeded sample reviews (`isSample=true`) and realistic sample boarding stays (`PN-BND-SEED01`, `PN-BND-SEED02`).
- **Multi-Night Boarding Availability Engine (`apps/api/src/modules/availability`):**
  - Section 14.4 compliant multi-night availability engine: dynamically computes remaining capacity for every night in requested stay range $[checkIn, checkOut)$ without stored slot records.
  - Hotel stay date boundaries: check-in is afternoon of checkIn date, check-out is morning of checkOut date; a booking occupies nights $d \in [checkIn, checkOut)$, ensuring departing and arriving guests on the same date do not collide.
  - Enforced next-day minimum lead time ($\ge$ tomorrow).
- **Server-Side Boarding Vaccination Policy Enforcement (`apps/api/src/modules/bookings` & `packages/shared`):**
  - Section 17 compliant server-side vaccine enforcement: Dogs require Rabies + DHPP + Bordetella; Cats require Rabies + FVRCP. All core vaccine expiration dates must be $\ge$ check-out date.
  - Server validation runs on both `POST /bookings/quote` and `POST /bookings`. Incomplete or expired records reject with `422 Unprocessable Entity` (`code: 'VACCINES_REQUIRED'`) detailing missing vaccines.
- **Transactional Boarding Booking Pipeline (`apps/api/src/modules/bookings`):**
  - `POST /bookings/quote`: Server-calculated nightly breakdown ($nights \times nightlyPrice$), pet size adjustment, and selected care add-ons. Client prices are never trusted.
  - `POST /bookings`: Atomic boarding reservation with mandatory `Idempotency-Key` header, transactional advisory locking (`pg_advisory_xact_lock(hashtext('boarding_unit:' + unitId))`), multi-night remaining capacity validation, pet ownership checks, and care routine storage (feeding, medications, behavioural notes, emergency contact).
  - Concurrency control: Tested with 25 simultaneous parallel requests competing for the final 1 unit of capacity — exactly 1 reservation succeeds (201) and 24 requests receive 409 `SLOT_TAKEN`.
- **Frontend Boarding Discovery, Booking Wizard & Dashboard (`apps/web`):**
  - Boarding Discovery Page (`/boarding`): Dedicated retreat search with responsive filters, interactive check-in/check-out search bar, starting nightly rates, amenities tags, and retreat cards.
  - Boarding Facility Detail Page (`/boarding/[slug]`): Comprehensive retreat view with suite tiers, luxury amenity chips, operational hours, guest reviews, and direct reservation CTA.
  - Reusable DateRangePicker Component (`DateRangePicker.tsx`): Calendar popover enforcing minimum 1-night stay, next-day lead time, visual stay selection, and duration badge.
  - Multi-Step Boarding Booking Wizard (`/book/boarding/[providerSlug]`): 4-step booking flow:
    1. Stay Dates & Suite Selection with dynamic nightly capacity badges.
    2. Pet Selection with live vaccination compliance check and real-time amber warnings for expired or missing vaccines.
    3. Custom Care Routine intake (feeding schedule, medications, temperament/behaviour, emergency contact).
    4. Authoritative Price Summary & Policy Review with server quote recalculation and instant booking confirmation.
  - Dashboard Stay Timeline (`/dashboard/bookings` & `/dashboard/bookings/[id]`): Stay duration badges, check-in and check-out schedule breakdown, suite allocation, care routine review card, and cancellation policy terms.

### Verified
- **Concurrency Test:** Exactly 1 out of 25 simultaneous parallel requests succeeds for the final available suite capacity; 24 requests receive 409 `SLOT_TAKEN`; database verified with exactly 1 reservation record.
- **Vaccination Enforcement:** Verified rejection of un-vaccinated and expired pets with `422 Unprocessable Entity` (`VACCINES_REQUIRED`) and success for fully compliant pets through check-out date.
- **Boundary Stays:** Verified adjacent stays (departing day $B$ vs arriving day $B$) do not block each other, and multi-night spans accurately exhaust capacity.
- **Idempotency Verification:** Replaying requests with identical `Idempotency-Key` safely returns cached booking details without double billing or capacity reduction.
- **Cross-User Isolation:** Scoped lookup returns `404 Not Found` when attempting to access another user's boarding booking.
- **Comprehensive API Tests:** 56/56 tests passing in `apps/api` (covering auth, pets, grooming, boarding, availability).
- **Full Monorepo Tests:** 72/72 tests passing across `apps/api` (56) and `apps/web` (16).
- **Typecheck & Production Build:** Clean monorepo typecheck (`pnpm -r typecheck`); Next.js production build succeeded with 21 static and dynamic pages.

---

## [Phase 4: Providers, Search & Grooming Booking] - 2026-10-14
### Added
- **Provider & Service Discovery (`apps/api/src/modules/providers`):**
  - Search & filter endpoints: `GET /providers` (supporting `type`, query `q`, `species`, `minPrice`, `maxPrice`, `minRating`, `city`, `neighborhood`, and cursor pagination) and `GET /providers/:slug` (full profile, hours, services, size-tier pricing, sample reviews, amenities).
  - Seed database populated per Appendix B with 8 distinctive grooming ateliers across NYC, realistic service menus (Full Groom, Bath & Deshed, Puppy Intro, Sanitary Trim), size-tiered pricing (XS to XL), operational hours (2 stations each), and sample reviews tagged `isSample=true`.
  - Transparent demo data tagging (`isSample: true`) on all seeded providers, services, and reviews.
- **Dynamic Slot Availability Engine (`apps/api/src/modules/availability`):**
  - Section 14.4 compliant slot generation without stored slot records: operates on-the-fly using provider operating hours, duration + buffer, station capacity, and minimum 120-minute lead time.
  - Strict timezone normalization using provider timezone (`America/New_York`).
- **Transactional Booking Pipeline (`apps/api/src/modules/bookings`):**
  - `POST /bookings/quote`: Authoritative server-side price calculation accounting for base service, species, size tier, and selected add-ons (client price never trusted).
  - `POST /bookings`: Atomic booking creation with mandatory `Idempotency-Key` header, transactional advisory locking (`pg_advisory_xact_lock`), station capacity bounds checking, pet ownership validation, and dynamic confirmation generation.
  - Double-booking prevention: Concurrency tested with 50 simultaneous parallel requests for a single slot, guaranteeing exactly 1 success (201) and 49 conflict rejections (409 `SLOT_TAKEN`).
  - Booking Management: `GET /bookings` (filtered by status), `GET /bookings/:id` (own bookings only, 404 for other users), `POST /bookings/:id/cancel` (policy-aware: free cancellation >= 24h before start), and `POST /bookings/:id/reschedule` (atomic slot reassignment).
- **Frontend Discovery, Wizard & Dashboard (`apps/web`):**
  - Grooming Marketplace Page (`/grooming`): Service hero, full filter sidebar (species, price range, rating, neighbourhood), search input, sorting, and responsive provider card grid with badges, price tags, and ratings.
  - Provider Detail Page (`/grooming/[slug]`): Gallery, atelier overview, operational hours, verified badge, service menu accordion with size pricing, customer reviews with sample badges, and direct booking CTA.
  - Multi-Step Booking Wizard (`/book/grooming/[providerSlug]`): 4-step streamlined checkout (Service selection, Pet selection with size calculation, Dynamic date & slot picker with timezone indicator, and Server-calculated Price Summary with cancellation policy terms).
  - Dashboard Bookings (`/dashboard/bookings` & `/dashboard/bookings/[id]`): Filterable booking tabs (Upcoming, Completed, Cancelled), booking timeline/status, pet badge, service breakdown, cancellation modal with refund preview, and direct reschedule modal.

### Verified
- **Concurrency Test:** 50 simultaneous parallel requests competing for 1 station slot — exactly 1 booking succeeded (201), 49 requests received 409 `SLOT_TAKEN`, and PostgreSQL verified with exactly 1 booking record.
- **Idempotency Verification:** Replaying requests with the same `Idempotency-Key` returns cached identical responses without re-executing booking creation.
- **Authorization Isolation:** Verified User B receives 404 Not Found when attempting to access or modify User A's booking.
- **Availability Engine Unit Tests:** 5/5 tests passed in `availability.test.ts` (timezone alignment, lead time filtering, station capacity saturation, invalid dates).
- **Comprehensive API Tests:** 41/41 tests passing in `apps/api`.
- **Full Monorepo Tests:** 57/57 tests passing across `apps/api` and `apps/web`.
- **Typecheck & Production Build:** Monorepo typecheck clean with 0 errors (`pnpm -r typecheck`); Next.js production build cleanly compiled 21 static and dynamic pages.

---

## [Phase 3: Pet Profiles & Vaccinations] - 2026-10-13
### Added
- **Pet Management Backend (`apps/api/src/modules/pets`):**
  - Full CRUD endpoints: `GET /pets`, `POST /pets`, `GET /pets/:id`, `PATCH /pets/:id`, `DELETE /pets/:id`.
  - Vaccinations management: `POST /pets/:id/vaccinations`, `PATCH /pets/:id/vaccinations/:vaccinationId`, `DELETE /pets/:id/vaccinations/:vaccinationId`.
  - Automatic size tier derivation (`deriveSizeTier`) based on species and weight in kg (XS, S, M, L, XL).
  - Dynamic vaccination status computation (`getVaccineStatus`): `UP_TO_DATE`, `DUE_SOON` (within 30 days), and `EXPIRED`.
  - Enforced soft-deletion booking conflict guard (409 Conflict with `ACTIVE_BOOKINGS_EXIST` if active future bookings exist for the pet).
  - Strict resource isolation: cross-user lookups on foreign pets or foreign vaccinations return `404 Not Found` (never 403) to prevent resource enumeration.
- **Storage & Pet Avatar Uploads (`apps/api/src/modules/uploads`):**
  - Storage adapter architecture (`LocalStorageAdapter`) generating HMAC-SHA256 signed upload and download URLs with 1-hour expiration.
  - Endpoints: `POST /uploads/presign`, `POST /uploads/direct`, and `GET /uploads/file`.
  - Secure MIME type validation (`image/jpeg`, `image/png`, `image/webp`), 5 MB maximum file size, and cryptographic signature verification.
- **Frontend Pet Experience (`apps/web`):**
  - Responsive Dashboard Layout (`/dashboard/layout.tsx`): Persistent desktop sidebar + mobile bottom tab bar (Home, Pets, Bookings, Orders, Account) with active route indicators and authentication redirect guard.
  - Dashboard Overview (`/dashboard/page.tsx`): Welcome greeting, global vaccination alert banner, quick care shortcuts, and quick-access pet grid.
  - Pet Directory (`/dashboard/pets/page.tsx`): List of pet profiles with species badges, size tiers, vaccination indicators, and empty state with new pet CTA.
  - Pet Creation Wizard (`/dashboard/pets/new/page.tsx`): Complete intake form capturing name, species, breed, sex, birth date, weight, temperament tags, fear triggers, medical conditions, allergies, and care notes.
  - Pet Profile Detail (`/dashboard/pets/[id]/page.tsx`): Tabbed layout (Overview, Vaccinations, Care Notes), quick stats, edit pet modal, safe delete modal with conflict handling, and full vaccination history.
  - Vaccination Manager (`VaccinationList.tsx`): Direct record addition with common vaccine presets (Rabies, DHPP, Bordetella, FVRCP, FeLV), inline editing, and deletion confirmation.
  - UI Components: `PetCard` (signature arched portrait), `VaccineStatusBadge`, `VaccineReminderBanner`, and `AvatarUploader` (direct presigned upload with preview).

### Verified
- **API Test Suite:** 16 comprehensive integration and authorization tests in `apps/api/src/modules/pets/pets.test.ts` covering:
  - Pet creation with auto-derived size tiers.
  - Adding, editing, and deleting vaccination records with status tracking.
  - Safe deletion prevention (409) when active future bookings exist for the pet.
  - Cross-user authorization isolation returning 404 for User B attempting to view, edit, delete, or modify User A's pet or vaccination records.
  - Presigned upload issuance, HMAC verification, direct upload, and signed download streaming.
- **Frontend Unit Tests:** 16 tests in `apps/web/src/lib/pets.test.ts` and `canUse3D.test.ts` verifying size tier derivations and dynamic vaccination status calculations.
- **TypeScript & Production Build:** Monorepo typecheck passed cleanly (`pnpm -r typecheck`); Next.js production build compiled 20 pages and routes with zero errors.

---

## [Phase 2: Authentication & Account Management] - 2026-10-13
### Added
- **Database Engine & Persistence:** Configured and started persistent local PostgreSQL 18.4 runtime (`pnpm db:start`); executed initial database migration `20261013171906_init` establishing all 23 Prisma models, enums, indices, and relations.
- **Self-Hosted Photography Assets:** Downloaded and self-hosted all 14 curated dog photography assets into `apps/web/public/images/` per Section 4.3; updated `image-manifest.json` and components to eliminate third-party hotlinking.
- **Backend Auth Architecture (`apps/api/src/modules/auth`):**
  - Argon2id password hashing with 20 MiB memory and 2 time cost (`hashPassword`, `verifyPassword`).
  - 15-minute JWT access tokens in `httpOnly; Secure; SameSite=Lax; Path=/` cookie `pn_at`.
  - 30-day rotating refresh tokens in `httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie `pn_rt`, hashed with SHA-256 in PostgreSQL.
  - Refresh token family rotation with automatic session-family termination upon reuse detection.
  - Double-submit CSRF protection via client-readable `pn_csrf` cookie and `X-CSRF-Token` header.
  - Endpoints: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`.
- **User & Account Management (`apps/api/src/modules/users`):**
  - `/me` (current authenticated profile), `PATCH /me` (update profile & preferences), `/me/change-password`.
  - `/me/export` (complete JSON user archive for GDPR/privacy compliance).
  - `DELETE /me` (account deletion and PII anonymization per Section 17).
  - `/me/addresses` (shipping address management).
  - `/dashboard/summary` (aggregated upcoming bookings, pet reminders, recent orders, and unread notifications).
- **Frontend Auth & Settings (`apps/web`):**
  - `AuthShell`: Arched split layout for authentication forms.
  - `/auth/sign-in`: Email/password login with return URL preservation (`?next=`).
  - `/auth/sign-up`: Account creation with terms acceptance and password guidelines.
  - `/auth/forgot-password`: Recovery request with generic responses to prevent user enumeration.
  - `/auth/reset-password`: Token consumption with new password confirmation.
  - `/auth/verify-email`: Token verification with immediate state feedback.
  - `/dashboard/settings`: Personal details form, password update, reduce-motion toggle, data export, and account deletion.
  - `AuthProvider` and `useAuth()` hook for application-wide session awareness.
  - Responsive `Header` account menu displaying authenticated user profile, dashboard links, and sign-out action.
  - Scoped repository helper `apps/api/src/lib/scopedRepo.ts` enforcing `userId` isolation and 404 on foreign resource access per Section 16.2.

### Verified
- **Database Connectivity:** `GET /ready` test verified live connection to PostgreSQL database `pawnest` on port 5432.
- **Prisma Migrations:** `20261013171906_init` successfully created and applied across all 25 tables.
- **Security & Authorization Test Suite:** Vitest passed 21/21 tests across `apps/api` (11 tests) and `apps/web` (10 tests):
  - Password hashing with Argon2id.
  - Duplicate registration rejection (409 Conflict).
  - Generic authentication failure response (no user enumeration).
  - Cookie security (`httpOnly` for access and refresh tokens).
  - Token rotation on refresh.
  - Replay/reuse attack detection (family-wide session revocation).
  - Protected route guard on `/me`.
  - Zero cross-user data leakage: User B receiving 404 when querying/modifying User A's address.
  - Password reset token consumption and 422 on invalid/expired tokens.
  - `canUse3D` 10 gating condition unit tests (reduced-motion, WebGL2, data saver, slow network, small screen, memory).
- **Next.js Production Build:** 17 static routes compiled and prerendered cleanly.

---

## [Phase 1: Design System & Homepage] - 2026-10-13
### Added
- Curated photography sourcing & licensing manifest (`apps/web/src/content/image-manifest.json`) covering 16 editorial shots per Appendix A.
- Motion preference system (`useMotionPreference`) integrating OS `prefers-reduced-motion` and persisted in-app toggle (localStorage + cookie).
- 3D capability detection (`canUse3D`) checking WebGL2, data saver, device memory, viewport width, and reduced motion per Section 5.3.
- Core UI primitives: `Button`, `Badge`, `Card`, `Input`, `Rating`, `Price`, and `Skeleton`.
- Layout composites: `Container`, `Section`, `ArchImage`, `Header`, and `Footer`.
- Complete 12-section Homepage (`apps/web/src/app/page.tsx`).
- Route shells for search composer destinations: `/grooming`, `/boarding`, `/vet`, and `/supplies`.
- SEO primitives: `sitemap.ts`, `robots.ts`, and JSON-LD Organization schema in `layout.tsx`.

---

## [Phase 0: Foundation & Tooling] - 2026-10-13
### Added
- Monorepo configured with pnpm workspaces and Turborepo.
- `packages/shared`, `packages/config`, `apps/api`, `apps/web`.
- Initial Fastify 5 setup and authoritative Prisma schema.
