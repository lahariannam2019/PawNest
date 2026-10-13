# Changelog

All notable changes to the PawNest platform will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and conventional commits.

## [Phase 0: Foundation & Tooling] - 2026-10-13
### Added
- Monorepo configured with pnpm workspaces and Turborepo.
- `packages/shared`: Shared Zod validation schemas, inferred TypeScript types, enums, error codes (RFC 7807), and DTOs.
- `packages/config`: Base TypeScript configurations (`tsconfig.base.json`).
- `apps/api`: Fastify 5 setup with `@fastify/cors`, `@fastify/helmet`, `@fastify/cookie`, `@fastify/rate-limit`, `@fastify/swagger`, RFC 7807 problem+json error handler, `/health` and `/ready` endpoints.
- `apps/api/prisma`: Full authoritative PostgreSQL schema (Section 14.2) with 23 models, enums, relations, and indices.
- `apps/web`: Next.js 15 App Router, React 19, Tailwind CSS v4 design tokens (`src/styles/tokens.css`), Fraunces and Manrope variable fonts, API rewrite proxy (`/api/v1/*`), and `/styleguide` design tokens showcase.
- `docker-compose.yml`: PostgreSQL 16, Mailpit, and MinIO service definitions.
- `.github/workflows/ci.yml`: Continuous integration workflow for linting, typechecking, Prisma generation, and tests.
- Documentation: `docs/PLAN.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `README.md`.

### Verified
- `pnpm --filter @pawnest/shared build`: Passed with 0 errors.
- `pnpm --filter api db:generate`: Prisma client generated successfully.
- `pnpm --filter api typecheck`: Strict TypeScript typecheck passed with 0 errors.
- `pnpm --filter api test`: Vitest suite passed 2/2 tests for `/health` and `/api/v1/info`.
- `pnpm --filter web typecheck`: Strict TypeScript typecheck passed with 0 errors.
- `pnpm --filter web build`: Next.js production build succeeded in 9.3s with 103 kB shared JS (budget: <= 170 kB).
