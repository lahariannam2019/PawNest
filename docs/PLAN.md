# PawNest — Product, Design & Engineering Plan

**Version 1.0 · 2026-10-13**
**Audience:** Antigravity (implementing agent) and the project owner
**Status:** Source of truth for the PawNest v1 build

---

## Contents

0. How to use this document
1. Product overview
2. Information architecture & routes
3. Design system
4. Imagery strategy
5. 3D hero & 3D usage
6. Motion & interaction specification
7. Responsive design specification
8. Accessibility & performance budgets
9. Page-by-page specifications
10. Key user flows
11. System architecture
12. Repository & folder structure
13. Frontend component architecture & state
14. Database schema
15. API specification
16. Authentication & authorization
17. Business rules & edge cases
18. Security & privacy
19. Testing strategy
20. Phased implementation roadmap
21. Deployment & environment
22. Demo data & integration policy
23. Risks
24. Open questions & assumptions
- Appendix A — Photography shot list
- Appendix B — Seed data specification
- Appendix C — Environment limitations (kept separate by design)

---

## 0. How to use this document (instructions for Antigravity)

1. **This plan is the source of truth.** If something is ambiguous, choose the simplest option consistent with the plan, record the decision in `docs/DECISIONS.md` (date, decision, reason), and continue. Only stop for true blockers (missing credentials, licensing, legal).
2. **Priority tags:** `[MUST]` required for v1 · `[SHOULD]` expected unless time-boxed out · `[COULD]` stretch.
3. **Work phase by phase** (Section 20). Do not start a phase until the previous phase's *Exit criteria* pass. Never stop at a static mockup: every phase ships working UI **and** working backend where applicable.
4. **Never replace a working feature with a placeholder** to simplify implementation.
5. **Every user-specific record is authorized on the backend** (Section 16). The frontend is never the security boundary.
6. **Persistent storage only** for core features (auth, pets, bookings, cart, orders). No frontend-only mock state.
7. **Demo data must be labelled** (Section 22). Never fabricate provider verification, live availability, payment completion, or external integration success.
8. **No secrets in client code.** Only variables prefixed `NEXT_PUBLIC_` reach the browser, and none of those may be a secret.
9. **After each phase:** run lint, typecheck, unit, API integration, and E2E tests; check browser console and server logs for errors; update `docs/CHANGELOG.md`; commit with a conventional-commit message.
10. **If your environment has a browser tool,** use it to verify the journeys listed per phase at 390 px, 768 px, and 1440 px widths. If it does not, run the Playwright suite and state in the phase report which visual checks were not performed.
11. **Report format after each phase:** what was built · what was tested and results · what failed and how it was fixed · open issues · next phase.

---

## 1. Product overview

### 1.1 Vision
PawNest is a premium, integrated pet-care marketplace where a dog parent can **find grooming, book boarding, schedule veterinary visits, and shop considered supplies** from one calm, beautiful place — backed by a single pet profile that makes every booking faster and safer.

**Brand feel:** a premium pet-lifestyle startup. Warm, editorial, spacious, quietly confident. *Elegant and cute, never childish.*

### 1.2 Primary personas

| Persona | Context | Needs |
|---|---|---|
| **Maya, 34** — urban professional, one dog | Works long days, travels monthly | Trustworthy boarding, quick rebooking of grooming, reminders |
| **Daniel, 28** — first-time puppy owner | Anxious, researching | Vet scheduling, vaccination tracking, curated starter supplies |
| **Priya, 41** — multi-pet household | Dog + cat, family calendar | Multiple pet profiles, one booking for several pets, order history |
| **Ops admin** (internal) | Runs the marketplace | Update order and booking status, manage demo/seed data |

### 1.3 Scope for v1

| Area | In v1 | Out of v1 (documented for later) |
|---|---|---|
| Accounts | Email/password, email verification, password reset, profile, addresses | Social login (optional Phase 10), 2FA |
| Pets | Dog/cat profiles, vaccinations, avatar upload, health notes | Pet insurance, shared pet access |
| Grooming | Provider search, service detail, slot-based booking, reschedule/cancel | Mobile (at-home) grooming routing |
| Boarding | Date-range availability, room types, care instructions, vaccination checks | Live webcam, daily photo updates |
| Veterinary | Clinic search, appointment types, slot booking, intake form | Telehealth, prescription fulfilment, emergency dispatch |
| Supplies | Catalogue, filters, PDP, cart, checkout, orders, order tracking states | Subscriptions, marketplace multi-vendor payouts |
| Dashboard | Overview, pets, bookings, appointments, orders, favourites, settings | Provider portal (providers are seeded/admin-managed in v1) |
| Admin | Minimal admin API to progress order/booking status | Full back-office UI |
| Payments | Stripe Checkout in test mode **or** clearly-labelled demo checkout | Live payments until credentials & legal review |

### 1.4 Success criteria (v1)
- A new user can **register → verify email → add a pet → book grooming → book boarding → book a vet appointment → add supplies to cart → check out → see everything in the dashboard**, with all data persisted in PostgreSQL.
- Lighthouse mobile ≥ 90 (Performance, Accessibility, Best Practices, SEO) on non-3D pages; ≥ 80 Performance on the homepage with 3D enabled.
- Zero cross-user data leakage in the authorization test matrix (Section 16.3).
- WCAG 2.2 AA on all core flows.

---

## 2. Information architecture & routes

| Route | Purpose | Auth | Rendering |
|---|---|---|---|
| `/` | Homepage | Public | Static + ISR (60 s) for featured data |
| `/grooming` | Groomer discovery (filters, map/list toggle) | Public | SSR with query params |
| `/grooming/[slug]` | Provider profile + services + reviews + book | Public (book requires auth) | ISR (60 s) |
| `/boarding`, `/boarding/[slug]` | Boarding discovery / detail | Public | SSR / ISR |
| `/vet`, `/vet/[slug]` | Clinic discovery / detail | Public | SSR / ISR |
| `/book/[kind]/[providerSlug]` | Booking wizard (`grooming`, `boarding`, `vet`) | **Required** | CSR (wizard) |
| `/supplies` | Catalogue home + category rails | Public | ISR |
| `/supplies/[category]` | Category listing with filters | Public | SSR |
| `/supplies/p/[slug]` | Product detail | Public | ISR |
| `/cart` | Cart page (drawer also available) | Public (guest cart) | CSR |
| `/checkout` | Address, delivery, payment | **Required** | CSR |
| `/orders/[id]` | Order confirmation / detail | **Required (owner only)** | SSR |
| `/auth/sign-in`, `/auth/sign-up` | Auth | Public (redirect if signed in) | SSR |
| `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` | Account recovery | Public | SSR |
| `/dashboard` | Overview | **Required** | CSR + SSR shell |
| `/dashboard/pets`, `/dashboard/pets/new`, `/dashboard/pets/[id]` | Pet profiles | **Required** | CSR |
| `/dashboard/bookings`, `/dashboard/bookings/[id]` | Grooming & boarding bookings | **Required** | CSR |
| `/dashboard/appointments` | Vet appointments (filtered bookings) | **Required** | CSR |
| `/dashboard/orders`, `/dashboard/favourites`, `/dashboard/settings` | Orders, saved items, account | **Required** | CSR |
| `/about`, `/help`, `/contact`, `/legal/terms`, `/legal/privacy`, `/legal/cancellation` | Content | Public | Static |
| `/404`, `/500` | Branded error pages | Public | Static |

---

## 3. Design system

### 3.1 Principles
1. **Calm over loud.** Generous whitespace, soft contrast, one focal point per viewport.
2. **Editorial, not template.** Large serif headlines, asymmetric layouts, photography-led.
3. **Warm and tactile.** Ivory canvas, tinted shadows, soft organic shapes (arches), never sharp neon or glossy gradients.
4. **Cute through photography and detail, not cartoons.** Real dogs, small delightful micro-interactions.
5. **Motion explains.** Every animation communicates hierarchy, state, or continuity.

### 3.3 Colour palette

**Ivory (canvas & surfaces)**
`ivory-50`: `#FDFBF6`
`ivory-100`: `#FAF6EE` (Page background)
`ivory-200`: `#F2EBDC`
`ivory-300`: `#E7DDC8`

**Sage (primary)**
`sage-50`: `#F1F5EE`
`sage-100`: `#E1EAD9`
`sage-200`: `#C5D5BA`
`sage-300`: `#A3BC95`
`sage-500`: `#6F8F72`
`sage-600`: `#587A5F`
`sage-700`: `#44614C` (Primary button bg)
`sage-800`: `#324839`
`sage-900`: `#22332A`

**Peach (warm accent)**
`peach-50`: `#FDF3EC`
`peach-100`: `#FBE6D8`
`peach-200`: `#F6D0B8`
`peach-400`: `#E79F78`
`peach-500`: `#D98660`
`peach-700`: `#8F4E31`

**Charcoal (text & dark)**
`charcoal-900`: `#1F2421`
`charcoal-800`: `#2A302D`
`charcoal-700`: `#3B423E`
`charcoal-600`: `#545C57`
`charcoal-500`: `#6F7872`

**Semantic:** success `#3F7D58` · warning `#B7791F` · danger `#B3412F` · info `#3F6E8C`

---

(Full specification details captured in codebase architecture and reference documentation.)
