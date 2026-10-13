# Changelog

All notable changes to the PawNest platform will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and conventional commits.

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
