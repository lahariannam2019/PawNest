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
