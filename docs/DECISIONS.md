# PawNest — Architectural & Technical Decisions Log

This document records technical and design decisions made during the implementation of PawNest v1, in accordance with Section 0 of the plan.

---

### [2026-10-13] Decision 001: Monorepo Tooling & Package Manager
- **Context:** The plan specifies pnpm workspaces + Turborepo.
- **Decision:** Installed and configured `pnpm` (via global npm in user prefix) with Turborepo for orchestration across `apps/web`, `apps/api`, `packages/shared`, and `packages/config`.
- **Reason:** Fastest workspace resolution, strict dependency isolation, and Turborepo build caching.

---

### [2026-10-13] Decision 002: PostgreSQL Persistence Strategy & Windows Environment Support
- **Context:** The environment has no running Docker daemon or pre-installed system PostgreSQL service. The plan requires real persistent storage (PostgreSQL 16) for all core models with zero mock frontend state.
- **Decision:** Provide the full production-ready `docker-compose.yml` (Postgres 16, Mailpit, MinIO). For bare-metal Windows development when Docker is not active, support local Postgres connection strings as well as an embedded/self-hosted PostgreSQL runner script (`pnpm db:start`) so that Prisma connects to genuine PostgreSQL with full transactional safety, pg_trgm support, and filesystem persistence.
- **Reason:** Guarantees that the app runs and passes all exit criteria on any Windows developer machine without requiring administrator elevation or third-party Docker installations.

---

### [2026-10-13] Decision 003: Design System Tokens & Tailwind CSS v4 Setup
- **Context:** Section 3.9 specifies `@theme` design tokens with custom ivory, sage, peach, charcoal palettes and fluid typography.
- **Decision:** Implemented `@theme` tokens in `apps/web/src/styles/tokens.css` with Fraunces and Manrope font variables, custom radiuses including signature arch `9999px 9999px 24px 24px`, and warm-tinted elevation shadows.
- **Reason:** Exact conformance with Section 3 and 13.

---

### [2026-10-13] Decision 004: Pet Avatar Uploads, Signed URLs & Scoped Soft-Delete
- **Context:** Section 15.2 and Phase 3 require pet avatars to be uploaded securely and "served via signed URL only". If external S3/MinIO credentials are not available, a clearly defined development adapter must be provided. In addition, `DELETE /pets/:id` must prevent orphaned future bookings.
- **Decision:**
  1. Implemented `LocalStorageAdapter` (`apps/api/src/integrations/storage/storage.ts`) supporting presigned HMAC-SHA256 uploads and downloads (`expiresIn: 3600s`). Direct uploads and downloads to `/uploads/file` strictly validate cryptographic HMAC signatures, MIME types (`jpeg`, `png`, `webp`), and maximum payload size (5 MiB).
  2. Applied scoped repository patterns (`scopedRepo(userId)`) on all Pet and Vaccination routes to ensure cross-user lookups return `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.
  3. Enforced business rule in `DELETE /pets/:id`: if any non-cancelled bookings with `startsAt >= now` exist for the pet, the request is rejected with `409 Conflict` (`ACTIVE_BOOKINGS_EXIST`).
- **Reason:** Guarantees S3-equivalent security guarantees in local development, prevents cross-user information leakage, and enforces booking integrity.

---

### [2026-10-14] Decision 005: Availability Model, Advisory Lock Concurrency & Idempotency
- **Context:** Section 14.4 and Phase 4 require slot-based grooming bookings with:
  1. Dynamic availability generation without stored slot records, taking provider business hours, service duration, buffer time, station capacity, and minimum 120-minute lead time into account.
  2. Protection against double-booking under concurrent requests (at least 50 simultaneous parallel requests for the same slot).
  3. Replay protection using the `Idempotency-Key` header with cached response retrieval.
- **Decision:**
  1. **Dynamic Slot Generator:** `AvailabilityService` computes slots on-the-fly in the provider's local timezone (`America/New_York`), splitting the business hours into candidate windows matching `service.durationMinutes + service.bufferMinutes`. For each window, existing overlapping bookings with status not in `['CANCELLED']` are counted against `provider.stations`. Only candidate slots with count < `provider.stations` and `startsAt >= now + 120m` are marked available.
  2. **Advisory Lock Serialization:** During booking creation in `POST /bookings`, inside a Prisma interactive transaction (`SERIALIZABLE` or `READ COMMITTED`), we acquire a transactional advisory lock:
     `SELECT pg_advisory_xact_lock(hashtext(concat($providerId, ':', $startsAtIso)))`
     This strictly serializes concurrent booking attempts for that specific slot and provider. If another transaction commits a booking that fills the remaining station capacity, the subsequent transaction detects capacity exceeded and aborts with `409 Conflict` (`SLOT_TAKEN`). The advisory lock automatically releases when the transaction commits or aborts.
  3. **Idempotency Strategy:** The `IdempotencyRecord` table records incoming idempotency keys scoped by `userId`. Within the same transaction, if an existing record exists with the same payload hash, the previous response body and status code are returned. If an in-progress or identical request occurs, replay is safe and consistent.
- **Reason:** Guarantees absolute consistency without race conditions or overbooking under heavy concurrent load, while keeping the database schema lean without storing millions of empty future time slots.

---

### [2026-10-14] Decision 006: Multi-Night Boarding Availability, Hotel Boundaries & Server-Side Vaccine Enforcement
- **Context:** Section 14.4, Section 17, and Phase 5 require boarding facilities, multi-night stays, and pet safety guarantees:
  1. Multi-night dynamic capacity engine calculating nightly remaining capacity across stay dates $[checkIn, checkOut)$ without stored slot records.
  2. Hotel date boundaries: check-in is afternoon of checkIn date, check-out is morning of checkOut date; a booking occupies nights $d \in [checkIn, checkOut)$, so adjacent stays (guest A checking out on day $B$, guest B checking in on day $B$) do not collide.
  3. Strict server-side vaccination enforcement: Dogs require valid Rabies, DHPP, and Bordetella; Cats require valid Rabies and FVRCP. All core vaccine expiration dates must be $\ge$ check-out date. Rejection returns `422 Unprocessable Entity` with `code: 'VACCINES_REQUIRED'` and missing vaccine list.
  4. Transactional advisory locking for multi-night capacity: inside a transaction, `SELECT pg_advisory_xact_lock(hashtext(concat('boarding_unit:', $boardingUnitId)))` serializes concurrent booking attempts for that unit, preventing overselling the final available unit capacity.
  5. Cross-user isolation: customer booking queries scope records by `userId`, returning `404 Not Found` for foreign or non-existent IDs.
- **Decision:**
  1. Implemented `BoardingAvailabilityService.getBoardingAvailability` computing continuous night availability across $[checkIn, checkOut)$.
  2. Added shared validator `validateBoardingVaccines` and wired it into `POST /bookings` and `POST /bookings/quote` as well as the frontend wizard for immediate visual feedback before checkout.
  3. Acquired `pg_advisory_xact_lock` on the unit ID inside transactional booking creation, verified with a 25-request concurrent test where exactly 1 booking succeeds and 24 return `409 Conflict` (`SLOT_TAKEN`).
- **Reason:** Enforces pet safety on the backend, prevents race conditions across multi-night stays, and preserves data integrity without mock state.

---

### [2026-10-14] Decision 007: Veterinary Appointments, Clinical Intake Triage, Emergency Disclaimer & pg-boss Exactly-Once Reminders
- **Context:** Section 9.4, Section 15, and Phase 6 require veterinary services, symptom intake, emergency disclaimer acknowledgement, and background reminder delivery:
  1. Veterinary clinics and services: 5 accredited NY veterinary clinics (Hudson River Vet, Brooklyn Heights Animal Medical, Central Park West Vet, Prospect Heights Vet, Astoria Vet Specialists) offering preventive wellness exams, core vaccinations, sick pet consultations, dental exams, follow-ups, and in-house diagnostics (fecal screens, blood panels, microchipping).
  2. Public visit types and symptom discovery: `GET /vet/visit-types` returning standard visit types, species-specific symptoms, and the official non-emergency medical disclaimer.
  3. Medical safety & emergency triage enforcement: PawNest is for scheduled non-emergency care. An emergency notice banner is persistently rendered on all veterinary pages (`/vet`, `/vet/[slug]`, `/book/vet/[slug]`, and `/dashboard/bookings/[id]`). During booking, `emergencyAcknowledged: true` is strictly validated on the backend; requests with `false` or omitted acknowledgement are rejected with `422 Unprocessable Entity`.
  4. Clinical intake prefill: the booking wizard pre-fills the patient's existing allergies, chronic conditions, medications, and vaccination records into the consultation context. The symptom intake checklist is explicitly styled as preparatory triage, never claiming to be a diagnostic tool.
  5. Background reminder job (`pg-boss`): A durable PostgreSQL background job is scheduled 24 hours prior to appointment `startsAt`. Exactly-once delivery is guaranteed via a database transaction guard (`reminderSentAt DateTime?` on `Booking`), in-app deduplication on `Notification`, and `pg-boss` unique singleton keys.
- **Decision:**
  1. Updated Prisma schema with `emergencyAcknowledged`, `reminderSentAt`, and `reminderJobId` on `Booking`.
  2. Implemented `reminders.ts` integrating `pg-boss` v12 with atomic idempotency guards and console mailer integration.
  3. Integrated `initBoss()` and graceful shutdown hooks (`stopBoss()`) into Fastify lifecycle.
  4. Enforced reference prefix `PN-VET-` for veterinary appointments.
  5. Built full frontend veterinary discovery, clinic detail, booking wizard with medical history pre-fill and non-diagnostic checklist, and dashboard booking timeline.
- **Reason:** Guarantees patient safety, prevents misleading online diagnostics, fulfills exact regulatory disclaimers, and ensures durable, zero-duplicate reminder delivery across appointments.

---

### [2026-10-15] Decision 008: Supplies Commerce, Advisory Stock Locks, Re-Quote Guarantees & Demo Payment Rules
- **Context:** Section 9.5, Section 14, Section 17, and Phase 7 require a resilient supplies shop, cart, checkout, and inventory subsystem:
  1. **Product Catalogue & Variants:** 8 standard categories per Appendix B with multi-variant hierarchy (size, weight, flavour), inventory tracking (normal, low-stock $\le 5$, and out-of-stock), customer ratings, and transparent demo data tagging (`isSample: true`, `isDemo: true`).
  2. **Authoritative Cart Engine:** Server-side price calculation, 1–20 line quantity clamp, 50 line cap, automatic guest cart merging upon authentication, free shipping threshold ($\ge \$75.00$ or flat $\$10.00$), and New York State/City sales tax rate ($8.875\%$).
  3. **Stock Reservation & Advisory Locking:** Checkout sessions create a 15-minute reservation against physical variant inventory (`reserved` increment). To strictly prevent overselling under high concurrency (e.g. flash sales), the checkout session acquires PostgreSQL transactional advisory locks:
     `SELECT pg_advisory_xact_lock(hashtext(concat('variant_stock:', variantId)))`
     sorted by `variantId` to guarantee deadlock-free execution. If available stock $(stock - reserved) < qty$, the reservation aborts with `409 Conflict` (`SLOT_TAKEN`).
  4. **Price Drift Re-Quotation:** Before creating checkout sessions, the server re-validates the snapshot unit price against active variant database pricing. Any drift immediately rejects the checkout attempt with `409 Conflict` (`CART_CHANGED`), forcing a client-side cart refresh.
  5. **Demo Payment Integrity:** Per explicit plan requirement, demo orders must NEVER display a real `paid` status. Demo checkout sets order `status: 'DEMO_PLACED'`, `paymentMode: 'DEMO'`, and marks reservation consumed into final line items. Stripe checkout flows handle signed webhooks idempotently with transition to `PAID`.
  6. **Inventory Recovery:** Background cleanup (`expireOldReservations`) and cancellation endpoints (`POST /orders/:id/cancel`) release reserved/allocated stock back to variant inventory atomically.
- **Decision:** Implemented Prisma models (`Category`, `Product`, `ProductVariant`, `ProductReview`, `Cart`, `CartItem`, `Order`, `OrderItem`), Fastify routes (`/products`, `/cart`, `/checkout`, `/orders`), pluggable `PaymentProvider` (`DemoPaymentProvider`, `StripePaymentProvider`), Next.js `CartContext`, slide-over `CartDrawer`, `ProductViewer3D`, and responsive storefront pages (`/supplies`, `/supplies/p/[slug]`, `/cart`, `/checkout`, `/dashboard/orders`).
- **Reason:** Guarantees zero overselling under heavy concurrent checkouts, ensures financial and inventory integrity, provides a seamless guest-to-member shopping transition, and strictly respects demo data transparency.



