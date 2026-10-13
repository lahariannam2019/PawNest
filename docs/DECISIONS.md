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

