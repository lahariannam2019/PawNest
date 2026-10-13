# PawNest 🐾

> A premium, integrated pet-care marketplace where a dog parent can find grooming, book boarding, schedule veterinary visits, and shop considered supplies from one calm, beautiful place.

Source of Truth specification: [`docs/PLAN.md`](./docs/PLAN.md)
Decisions log: [`docs/DECISIONS.md`](./docs/DECISIONS.md)
Changelog: [`docs/CHANGELOG.md`](./docs/CHANGELOG.md)

---

## Architecture & Monorepo Structure

- `apps/web`: Next.js 15 (App Router), React 19, Tailwind CSS v4, Motion, Lucide icons
- `apps/api`: Fastify 5 + TypeScript, Prisma ORM, PostgreSQL, RFC 7807 problem+json error handling, OpenAPI/Swagger docs
- `packages/shared`: Shared Zod validation schemas, inferred types, enums, error codes
- `packages/config`: Shared TypeScript and ESLint presets

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 20.x (tested on v24)
- pnpm >= 9.x (installed: `12.11.2`)
- Optional: Docker for running Postgres 16, Mailpit, and MinIO via docker-compose

### 2. Setup
```bash
# Clone and enter repo
git clone <repo-url> pawnest
cd pawnest

# Install dependencies across all workspaces
pnpm install

# Copy environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Database Services
Start services via Docker Compose:
```bash
docker compose up -d
```
Or use the embedded/local Postgres configuration:
```bash
pnpm db:start
```

Run database migrations:
```bash
pnpm db:migrate
```

Seed initial demo data:
```bash
pnpm db:seed
```

### 4. Run Development Servers
```bash
pnpm dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- Design Tokens Showcase: [http://localhost:3000/styleguide](http://localhost:3000/styleguide)
- Fastify API: [http://localhost:4000](http://localhost:4000)
- Swagger API Docs: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- API Health Status: [http://localhost:4000/health](http://localhost:4000/health)

### 5. Running Tests
```bash
# Run all workspace test suites
pnpm test

# Run type checks
pnpm typecheck
```
