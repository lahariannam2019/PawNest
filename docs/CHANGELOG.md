# Changelog

All notable changes to the PawNest platform will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and conventional commits.

## [Phase 1: Design System & Homepage] - 2026-10-13
### Added
- Curated photography sourcing & licensing manifest (`apps/web/src/content/image-manifest.json`) covering 16 editorial shots per Appendix A.
- Motion preference system (`useMotionPreference`) integrating OS `prefers-reduced-motion` and persisted in-app toggle (localStorage + cookie).
- 3D capability detection (`canUse3D`) checking WebGL2, data saver, device memory, viewport width, and reduced motion per Section 5.3.
- Core UI primitives: `Button` (primary, secondary, ghost, link, peach), `Badge` (with dashed demo badge border), `Card` (with warm shadow-1 and hover lift), `Input` (floating/compact with error alert), `Rating` (5 small sage stars + tabular count), `Price` (minor unit formatting + compare-at price), and `Skeleton` (shimmer).
- Layout composites: `Container` (responsive gutters), `Section`, `ArchImage` (signature arch `9999px 9999px 24px 24px` with warm elevation and graceful fallback), `Header` (scroll-reactive blur navigation), and `Footer` (newsletter form, demo mode banner, reduce-motion toggle).
- Complete 12-section Homepage (`apps/web/src/app/page.tsx`):
  1. Header with logo, navigation, search, favourites, cart badge, and user actions.
  2. Hero with Fraunces 350 display headline (*"Care that feels like home."* with italic *home*), CTAs, arch photo, floating context chips ("Next grooming", "Vaccines up to date"), and SearchComposer.
  3. ValuesStrip with 4 value statements and line icons.
  4. ServicesBento with asymmetric bento cards for Grooming, Boarding, Veterinary, and Supplies.
  5. HowItWorks 3-step storytelling with cards and imagery.
  6. FeaturedProviders horizontal snap rail with 6 provider cards and demo badges.
  7. SuppliesPreview category chips + 4-up product cards with quick-add.
  8. PetProfileFeature split view showcasing the unified pet card and vaccine alert arc.
  9. SampleStories 3 testimonial cards clearly labelled with "Sample Stories" badge.
  10. CtaBand with sage-900 background, warm ambient glow, and sign-up action.
  11. Footer with demo environment badge and in-app reduce motion control.
- Route shells for search composer destinations: `/grooming`, `/boarding`, `/vet` (with emergency safety notice per Section 9.4), and `/supplies`.
- SEO primitives: `sitemap.ts`, `robots.ts`, and JSON-LD Organization schema in `layout.tsx`.

### Verified
- `pnpm turbo run typecheck`: 3/3 packages passed with 0 errors.
- `pnpm --filter web build`: Next.js production build succeeded; all 11 static pages generated.
- Bundle budget: Home initial JS shared is 103 kB (well below the 170 kB budget).
- Reduced motion toggle verified across components.

---

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
