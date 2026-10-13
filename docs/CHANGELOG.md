# Changelog

All notable changes to the PawNest platform will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and conventional commits.

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
