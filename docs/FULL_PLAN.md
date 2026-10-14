<USER_REQUEST>
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

**Primary navigation:** Grooming · Boarding · Veterinary · Supplies · (right) Search · Favourites · Cart · Account.
**Mobile:** hamburger sheet on marketing pages; **bottom tab bar** in dashboard (Home, Pets, Bookings, Orders, Account).

---

## 3. Design system

### 3.1 Principles
1. **Calm over loud.** Generous whitespace, soft contrast, one focal point per viewport.
2. **Editorial, not template.** Large serif headlines, asymmetric layouts, photography-led.
3. **Warm and tactile.** Ivory canvas, tinted shadows, soft organic shapes (arches), never sharp neon or glossy gradients.
4. **Cute through photography and detail, not cartoons.** Real dogs, small delightful micro-interactions.
5. **Motion explains.** Every animation communicates hierarchy, state, or continuity.

### 3.2 Design references (study for qualities — do not copy)

| Reference | Take from it |
|---|---|
| **Wild One** (pet lifestyle brand) | Confident, modern pet-brand tone; premium product photography on warm backdrops |
| **Aesop** (aesop.com) | Typographic restraint, warm neutrals, editorial spacing |
| **Airbnb** | Search composer, listing cards, booking summary sidebar patterns |
| **Apple product pages** | Scroll-driven storytelling, sticky sections, hero-to-content transitions |
| **Linear** | Micro-interaction polish, keyboard friendliness, quiet motion |
| **Rover / Wag** | Domain expectations: trust cues, reviews, availability, booking confirmation |
| **Kinfolk / Cereal (magazines)** | Photographic composition, whitespace, caption styling |

**Anti-references (avoid):** primary-colour palettes, bubbly rounded fonts, paw-print confetti, cartoon mascots, costume/party-hat stock photos, heavy drop shadows, glassmorphism overload, gradient-purple SaaS dashboards.

### 3.3 Colour palette

All values are design tokens. Contrast ratios below are approximate — **verify with axe in CI**.

**Ivory (canvas & surfaces)**

| Token | Hex | Use |
|---|---|---|
| `ivory-50` | `#FDFBF6` | Cards on ivory-100, input background |
| `ivory-100` | `#FAF6EE` | **Page background** |
| `ivory-200` | `#F2EBDC` | Sections, subtle fills |
| `ivory-300` | `#E7DDC8` | Borders, dividers |

**Sage (primary)**

| Token | Hex | Use |
|---|---|---|
| `sage-50` | `#F1F5EE` | Tints, selected rows |
| `sage-100` | `#E1EAD9` | Badges, chips |
| `sage-200` | `#C5D5BA` | Focus halos, illustrations |
| `sage-300` | `#A3BC95` | Decorative |
| `sage-500` | `#6F8F72` | Icons, secondary accents |
| `sage-600` | `#587A5F` | Links (≈4.8:1 on white) |
| `sage-700` | `#44614C` | **Primary button background** (≈6.8:1 with white text) |
| `sage-800` | `#324839` | Primary hover/pressed |
| `sage-900` | `#22332A` | Dark sections |

**Peach (warm accent)**

| Token | Hex | Use |
|---|---|---|
| `peach-50` | `#FDF3EC` | Highlight backgrounds |
| `peach-100` | `#FBE6D8` | Chips, promo bands |
| `peach-200` | `#F6D0B8` | Illustration fills |
| `peach-400` | `#E79F78` | Decorative accents, hover glows |
| `peach-500` | `#D98660` | Accent (decorative only; not for body text) |
| `peach-700` | `#8F4E31` | Accent **text** on ivory (≈5.8:1) |

**Charcoal (text & dark)**

| Token | Hex | Use |
|---|---|---|
| `charcoal-900` | `#1F2421` | Headlines, primary text |
| `charcoal-800` | `#2A302D` | Dark surfaces |
| `charcoal-700` | `#3B423E` | Body text |
| `charcoal-600` | `#545C57` | Secondary text (≈6.4:1 on ivory) |
| `charcoal-500` | `#6F7872` | Disabled / large decorative text only |

**Semantic:** success `#3F7D58` · warning `#B7791F` · danger `#B3412F` · info `#3F6E8C` (each with 50/100 tints for backgrounds).

**Usage ratio:** ~70% ivory, ~15% charcoal/ink, ~10% sage, ~5% peach.
**Rule:** primary CTA is always `sage-700`; peach is for highlights, never for primary buttons.

### 3.4 Typography

| Role | Font | Notes |
|---|---|---|
| Display / headlines | **Fraunces** (variable, serif) | Weights 300–500, optical size on, `SOFT` ≈ 30, `WONK` 0 |
| UI / body | **Manrope** (variable, sans) | Weights 400/500/600/700 |

Load with `next/font` (self-hosted, `display: swap`, latin subset, preload display + body).

| Style | Font | Size (fluid) | Line height | Tracking |
|---|---|---|---|---|
| `display-2xl` (hero) | Fraunces 350 | `clamp(3.25rem, 2.2rem + 4.6vw, 6.25rem)` | 1.00 | −0.02em |
| `display-xl` | Fraunces 350 | `clamp(2.5rem, 1.9rem + 2.8vw, 4.5rem)` | 1.05 | −0.015em |
| `h1` | Fraunces 400 | `clamp(2.25rem, 1.8rem + 2vw, 3.5rem)` | 1.10 | −0.01em |
| `h2` | Fraunces 400 | `clamp(1.75rem, 1.5rem + 1.1vw, 2.5rem)` | 1.15 | −0.01em |
| `h3` | Fraunces 400 | `1.5rem` | 1.25 | 0 |
| `h4` | Manrope 600 | `1.125rem` | 1.35 | 0 |
| `body-lg` | Manrope 400 | `1.125rem` | 1.65 | 0 |
| `body` | Manrope 400 | `1rem` | 1.60 | 0 |
| `body-sm` | Manrope 400 | `0.875rem` | 1.50 | 0 |
| `caption` | Manrope 500 | `0.75rem` | 1.40 | +0.02em |
| `eyebrow` | Manrope 700 uppercase | `0.75rem` | 1.30 | +0.14em |

Rules: max line length 68 characters for prose; headlines use `text-wrap: balance`; numerals in prices use `font-variant-numeric: tabular-nums`; italic Fraunces allowed for one emphasised word per headline.

### 3.5 Spacing, grid, shape, elevation
- **Spacing:** 4 px base; scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Section padding:** desktop 112–128 px, tablet 80 px, mobile 56–64 px.
- **Container:** max 1280 px (content), 1440 px (full-bleed imagery); gutters 20 px (mobile) / 32 px (tablet) / 48 px (desktop).
- **Grid:** 4 columns (mobile), 8 (tablet), 12 (desktop), 24 px gap.
- **Radius:** `sm 8` (inputs, chips) · `md 14` (buttons) · `lg 20` (cards) · `xl 32` (feature cards) · `arch` = `9999px 9999px 24px 24px` (signature arch frame) · `pill 9999`.
- **Elevation (warm-tinted):**
  - `shadow-1`: `0 1px 2px rgba(31,36,33,.05)`
  - `shadow-2`: `0 8px 24px -8px rgba(31,36,33,.10)`
  - `shadow-3`: `0 24px 48px -16px rgba(31,36,33,.16)`
  - `shadow-focus`: `0 0 0 3px rgba(111,143,114,.35)`
- **Borders:** 1 px `ivory-300`; never pure black.
- **Signature shape:** the **arch** (window/doorway) frames hero and feature photography. Use consistently, not everywhere.

### 3.6 Iconography & illustration
- **Lucide** icons, stroke 1.5 px, 20/24 px sizes, `currentColor`.
- Custom marks: a refined **paw-in-arch** logomark (single-weight, geometric). Paw motifs appear only in logo, favicon, and empty states — drawn as thin line art in sage, never as confetti or patterns.
- No cartoon illustration. Empty states use photography crops or minimal line art.

### 3.7 Voice & microcopy
Warm, calm, plainspoken. No exclamation marks in UI, no "fur baby", no pun overload. Examples:
- Empty pets: *"No pets yet. Add your first companion and booking gets faster."*
- Booking success: *"You're booked. We've added it to your dashboard."* (demo: *"Demo booking saved. It was not sent to a real provider."*)
- Error: *"That didn't go through. Your details are safe — try again."*

### 3.8 Core component styling

| Component | Spec |
|---|---|
| **Button primary** | `sage-700` bg, ivory-50 text, radius 14, height 48 (44 min mobile), px 24; hover `sage-800` + `translateY(-1px)` + `shadow-2`; active `scale(.98)`; focus `shadow-focus` |
| **Button secondary** | transparent, 1 px `charcoal-900` border, hover fill `ivory-200` |
| **Button ghost / link** | text only, underline-offset 4 px, animated underline (scaleX 0→1, 200 ms) |
| **Input** | height 52, bg `ivory-50`, border `ivory-300`, radius 14; floating label; focus border `sage-600` + halo; error border `danger` + message with icon (not colour only) |
| **Card** | bg `ivory-50`, border `ivory-300`, radius 20, `shadow-1`; hover lift (Section 6) |
| **Badge/Chip** | radius pill, `sage-100` or `peach-100`, 12 px/600 text; **Demo** badge uses dashed `peach-500` border |
| **Rating** | 5 small sage stars, numeric value + count, never fabricated for real providers |
| **Toast** | bottom-centre (mobile) / top-right (desktop), ivory-50, 4 s, `aria-live="polite"` |
| **Dialog / Sheet** | Radix primitives; scrim `rgba(31,36,33,.45)`; sheet slides 320 ms; focus trap |
| **Skeleton** | `ivory-200` base, shimmer 1.4 s linear, respects reduced motion |
| **Stepper** | Numbered nodes joined by a line; completed = sage check with path-draw |

### 3.9 Design tokens (Tailwind v4 `@theme` — implement in `apps/web/src/styles/tokens.css`)

```css
@theme {
  --color-ivory-50:#FDFBF6; --color-ivory-100:#FAF6EE; --color-ivory-200:#F2EBDC; --color-ivory-300:#E7DDC8;
  --color-sage-50:#F1F5EE; --color-sage-100:#E1EAD9; --color-sage-200:#C5D5BA; --color-sage-300:#A3BC95;
  --color-sage-500:#6F8F72; --color-sage-600:#587A5F; --color-sage-700:#44614C; --color-sage-800:#324839; --color-sage-900:#22332A;
  --color-peach-50:#FDF3EC; --color-peach-100:#FBE6D8; --color-peach-200:#F6D0B8; --color-peach-400:#E79F78; --color-peach-500:#D98660; --color-peach-700:#8F4E31;
  --color-charcoal-900:#1F2421; --color-charcoal-800:#2A302D; --color-charcoal-700:#3B423E; --color-charcoal-600:#545C57; --color-charcoal-500:#6F7872;
  --color-success:#3F7D58; --color-warning:#B7791F; --color-danger:#B3412F; --color-info:#3F6E8C;

  --font-display: var(--font-fraunces), "Iowan Old Style", Georgia, serif;
  --font-sans: var(--font-manrope), ui-sans-serif, system-ui, sans-serif;

  --radius-sm:8px; --radius-md:14px; --radius-lg:20px; --radius-xl:32px;

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring-soft: cubic-bezier(0.34, 1.3, 0.64, 1);
  --dur-micro:120ms; --dur-fast:200ms; --dur-base:320ms; --dur-slow:560ms; --dur-hero:900ms;
}
:root { color-scheme: light; }                /* v1 is light-only; dark mode is [COULD] */
body { background: var(--color-ivory-100); color: var(--color-charcoal-700); }
```

---

## 4. Imagery strategy

### 4.1 Art direction
- **Subject:** dogs first (golden retriever, labrador, French bulldog, dachshund, border collie, poodle, senior mixed-breed rescue, a puppy), plus a few cats for the supplies and vet context. Diverse breeds, sizes, and ages.
- **Light:** natural, window or golden-hour, soft shadows, no flash.
- **Colour grade:** warm, slightly lifted blacks, gentle desaturation of greens toward sage; skin and fur tones true.
- **Composition:** eye-level, shallow depth of field, negative space for text overlays, one subject.
- **Humans:** hands, shoulders, or partial profiles preferred (fewer licensing risks, more timeless). Diverse people when faces appear.
- **Avoid:** costumes, party hats, harsh flash, text baked into images, busy backgrounds, visible third-party brand logos, anything that looks like generic clip art.

### 4.2 Sourcing & licensing `[MUST]`
- Use **only licensed or owner-supplied** photography: commissioned shoot (best), Unsplash/Pexels (free licences), or paid stock (Adobe Stock, Getty). **Never hotlink** — download, process, self-host.
- Record every image in `apps/web/src/content/image-manifest.json`: `id, file, source, photographer, licenseUrl, attributionRequired, dateAcquired, altText, focalPoint`.
- Where attribution is required, show it in the footer "Photo credits" page.
- Appendix A defines the starter shot list with briefs, so photos can be sourced or commissioned in parallel with development.

### 4.3 Technical pipeline
- **Originals:** ≥ 3000 px long edge, stored in `apps/web/assets-src/` (git-LFS or external storage), never served directly.
- **Derivatives:** AVIF + WebP + JPEG fallback at widths 480, 768, 1080, 1440, 1920, 2400 via `sharp` (script `pnpm images:build`) or `next/image`.
- **Placeholders:** 24 px blurred LQIP (base64) generated per image, inlined to prevent layout shift.
- **`sizes` attribute** must be set on every responsive image; `priority`/`fetchpriority="high"` **only** for the hero LCP image.
- **Art direction:** hero uses `<picture>` with portrait crop (4:5) < 768 px and wide crop (arch, 4:5 inside a 12-col grid) ≥ 768 px.
- **Lazy loading:** everything below the fold uses `loading="lazy"` + `decoding="async"`.
- **Aspect ratios** are reserved via CSS `aspect-ratio` (CLS ≤ 0.05).
- **Fallbacks:** `onError` swaps to a tonal gradient (`ivory-200 → peach-100`) with a small line-art paw mark; never a broken-image icon. Dev-only placeholder generator produces tonal images labelled **"Placeholder — replace"**; the CI check `pnpm images:check` **fails the production build** if any placeholder asset is still referenced.
- **Alt text rules:** describe the subject and context (*"A golden retriever resting on a linen sofa in morning light"*); decorative images use `alt=""`.
- **Product images:** 4:5, neutral `ivory-100`/`peach-50` backdrops, consistent soft contact shadow, minimum 3 images per hero product (front, detail, in-use).

---

## 5. 3D hero & 3D usage

**Principle:** real 3D only where it elevates the experience — **the homepage hero** `[SHOULD]` and an optional **product viewer** for up to five hero products `[COULD]`. Everything else stays 2D for performance.

### 5.1 Realism strategy (be honest about the uncanny valley)
A believable real-time dog needs a good asset. The plan supports four sourcing routes, in preference order:

1. **Commissioned GLB** from a 3D artist (best fidelity, owned licence).
2. **Licensed marketplace model** (Sketchfab / CGTrader / TurboSquid) — confirm licence permits commercial web use; log attribution.
3. **Photogrammetry/scan** of a consenting dog with owner release, retopologised.
4. **Refined stylised sculpt** (matte ceramic/clay finish) if photorealism isn't achievable — still elegant, never cartoonish.

**Delivery rule:** Phase 1 ships a **fully working photographic hero**. The 3D layer is added behind `NEXT_PUBLIC_HERO_3D=true` once an approved asset exists, so the 3D asset never blocks launch.

### 5.2 Technical specification
- **Stack:** `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (optional, desktop only). Loaded via `next/dynamic` with `ssr:false`, **only after** the LCP image is painted (`requestIdleCallback`).
- **Asset budget:** GLB ≤ **1.5 MB** after Draco/meshopt + KTX2; ≤ 45k triangles; ≤ 2 materials; textures ≤ 2048² (body) / 1024² (others); ≤ 60 bones.
- **Pipeline:** `gltf-transform optimize --compress meshopt --texture-compress ktx2 input.glb public/models/hero-dog.glb`.
- **Lighting:** warm key (≈3500 K), sage-tinted fill, peach rim; small local HDRI (≤ 200 KB) for reflections; ACES Filmic tone mapping; sRGB output; soft `ContactShadows` on an invisible ground plane.
- **Fur:** card/alpha-cutout fur only on desktop; **no shell-fur on mobile**.
- **Animation clips:** `idle` (breathing, 4 s loop), `tail-soft` (slow, low amplitude), `head-look` (neck/head bones aim at pointer, damping 0.08, clamp ±25° yaw / ±12° pitch).
- **Scroll link:** model yaw −12° → +12° and camera dolly 1.0 → 0.9 across the hero scroll range (GSAP ScrollTrigger scrub 0.6).
- **Render loop:** `frameloop="demand"`; pause when offscreen (IntersectionObserver) or tab hidden; `dpr={[1, 1.75]}`; adaptive via `<PerformanceMonitor>`.
- **Poster:** pre-rendered AVIF/WebP of the same camera angle, transparent background, occupying the same aspect-ratio box → swapped to live canvas with a 600 ms cross-fade, no layout shift.

### 5.3 Fallback & gating (all must be implemented)
Show the poster/photo hero (no WebGL) when **any** is true: `prefers-reduced-motion`, no WebGL2, `navigator.connection.saveData`, effective connection `slow-2g/2g/3g`, `deviceMemory < 4`, viewport < 768 px, WebGL context lost, model failed to load within 8 s, or `NEXT_PUBLIC_HERO_3D` is not `true`.

### 5.4 3D budgets
Added JS for 3D chunk ≤ 250 KB gzip (tree-shaken imports only); main-thread long tasks from 3D ≤ 50 ms; the 3D chunk must never be in the initial bundle.

---

## 6. Motion & interaction specification

### 6.1 Libraries
- **`motion`** (Framer Motion) — component reveals, layout animation, presence, gestures.
- **GSAP + ScrollTrigger** — pinned/scrubbed storytelling sections and hero scroll choreography only.
- **Lenis** — smooth scrolling (disabled under reduced motion and on touch devices unless tested smooth).
- **View Transitions API** (with fallback fade) — route transitions.
- Animate **only `transform` and `opacity`** (plus `clip-path` for arch reveals). No layout-thrashing animations.

### 6.2 Tokens
| Token | Value | Use |
|---|---|---|
| `ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | Entrances, reveals |
| `ease-in-out-soft` | `cubic-bezier(.65,0,.35,1)` | Position/scale changes |
| `ease-spring-soft` | `cubic-bezier(.34,1.3,.64,1)` | Playful accents (badge bounce) |
| `dur-micro` | 120 ms | Press, toggle |
| `dur-fast` | 200 ms | Hover, underline |
| `dur-base` | 320 ms | Drawer, tab, dropdown |
| `dur-slow` | 560 ms | Section reveals |
| `dur-hero` | 900 ms | Hero entrance |

### 6.3 Homepage hero choreography (timeline)

| Time | Event |
|---|---|
| 0 ms | Ivory canvas; header fades in (200 ms) |
| 100–900 ms | Headline lines reveal: each line inside `overflow:hidden`, `translateY(100%)→0`, 80 ms stagger, `ease-out-expo` |
| 300–1200 ms | Arch photo reveals via `clip-path: inset(100% 0 0 0 round 9999px 9999px 24px 24px)` → `inset(0)`; image scales 1.12 → 1.0 |
| 700 ms | Subhead + CTAs fade-rise (24 px, 500 ms) |
| 800 ms | Search composer rises (32 px, 560 ms) |
| 900 ms+ | Floating context chips drift in (each 120 ms later) and idle-float ±6 px, 6–9 s loops, different phases |
| After LCP | 3D dog canvas cross-fades over the photo (600 ms, scale .96 → 1) when allowed (Section 5.3) |
| Scroll 0–100 vh | Arch expands toward full-bleed (scale ≤ 1.12, radius tightens), headline translates −40 px and fades to 0.6, chips parallax at depths 0.15/0.3/0.45, 3D yaw/dolly scrubbed |

### 6.4 Global interaction spec

| Interaction | Specification |
|---|---|
| **Scroll reveal** | `translateY(24px)+opacity 0 → 0/1`, 600 ms `ease-out-expo`, stagger 70 ms among siblings, `once`, trigger when 15% of element is visible |
| **Parallax** | Image layers move at speeds −0.08 / +0.12 / +0.2 of scroll; clamp translate ±80 px; halve on tablet, ≤ 40% on mobile; disabled under reduced motion |
| **Navbar** | Transparent at top; after 80 px scroll becomes `ivory-100/85` + `backdrop-blur(12px)` + 1 px border; hides on scroll-down, shows on scroll-up (240 ms) |
| **Route transition** | Outgoing content fades/slides up 8 px (160 ms); incoming fades/slides in (280 ms); shared-element for card → detail image where supported (View Transitions) |
| **Interactive cards** | Hover: `translateY(-4px)`, `shadow-1 → shadow-3`, image scale 1.04 (700 ms); desktop pointer tilt ≤ 4° with 0.12 damping (pointer: fine only); focus-visible mirrors hover |
| **Primary CTA (hero only)** | Magnetic offset ≤ 6 px within 80 px radius; press scale .98 |
| **Buttons** | Press scale .98 (120 ms); loading state shows inline spinner, width locked |
| **Link underline** | `scaleX(0→1)` from left, 200 ms |
| **Add to cart** | Product thumbnail flies on a curved path to cart icon (600 ms), cart badge bounces (`ease-spring-soft`), toast confirms |
| **Favourite heart** | Fill with 1.0 → 1.25 → 1.0 spring (280 ms) + 6 sage particles (≤ 400 ms, desktop only) |
| **Tabs / segmented control** | Animated pill indicator using shared `layoutId` (320 ms) |
| **Accordion** | Height + opacity 320 ms; chevron rotates 180° |
| **Form field** | Floating label 160 ms; error shake ≤ 4 px × 2 (200 ms) **only** when motion allowed; success check path-draw 400 ms |
| **Wizard steps** | Direction-aware slide (±24 px) + fade, 320 ms; progress line fills |
| **Slot picker** | Selected slot scales 1.02 with sage fill; unavailable slots are struck-through and `aria-disabled` |
| **Counters** | Count-up 1.2 s once visible (only for real data or clearly-labelled demo data) |
| **Skeletons** | Shimmer 1.4 s; replaced with content via 200 ms fade |
| **Pet avatar upload** | Drag-over ring pulse; progress arc; crop dialog |
| **Booking confirmation** | Check path-draw 400 ms + subtle arch outline expanding; no confetti |

### 6.5 Reduced motion `[MUST]`
Under `prefers-reduced-motion: reduce`: disable Lenis, parallax, magnetic, tilt, float loops, particle bursts, 3D autoplay; replace transforms with ≤ 150 ms opacity fades; static hero photo; instant scroll. Provide an in-app **"Reduce motion"** toggle in footer/settings that mirrors this state (persisted in localStorage + cookie).

---

## 7. Responsive design specification

**Breakpoints (Tailwind):** `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. **QA widths:** 360, 390, 768, 1024, 1280, 1440, 1920.

| Concern | Mobile (< 768) | Tablet (768–1023) | Desktop (≥ 1024) |
|---|---|---|---|
| Grid | 4 col, 20 px gutters | 8 col, 32 px | 12 col, 48 px, max 1280 |
| Header | Logo + cart + hamburger sheet | Logo + condensed nav + icons | Full nav, search, account menu |
| Hero | Stacked: portrait arch photo on top, text below, composer full-width; **no 3D** | Two-column 5/7, 3D optional | Two-column 6/6, 3D enabled when allowed |
| Search composer | Tabs scroll horizontally; fields stacked | Two-row | Single row pill |
| Service cards | 1 column, horizontal swipe rail option | 2 × 2 bento | 4-up bento (asymmetric) |
| Listings | Filters in bottom sheet; list only | Filters in side drawer; 2 col | Sticky left filters; 3 col; map toggle |
| Product grid | 2 col | 3 col | 4 col |
| Booking wizard | Full-screen steps; sticky bottom summary bar | Centered 640 px card | Two-column: steps + sticky summary |
| Dashboard | Bottom tab bar; stacked cards | Collapsed rail nav | Left sidebar 264 px + content |
| Tables | Convert to stacked cards | Horizontal scroll with sticky first column | Full table |
| Touch targets | ≥ 44 × 44 px | ≥ 44 px | ≥ 40 px |
| Motion | Parallax ≤ 40%, no tilt, no Lenis unless smooth | Parallax 50% | Full |

Rules: no horizontal page scroll at any width; images never exceed container; text never below 14 px; forms use correct `inputmode`/`autocomplete`; sticky elements respect `env(safe-area-inset-*)`.

---

## 8. Accessibility & performance budgets

**Accessibility `[MUST]` — WCAG 2.2 AA**
- Semantic landmarks, skip-to-content link, logical heading order, visible focus rings (`shadow-focus`), focus trap in dialogs, focus restored on close.
- Full keyboard operation of nav, cards, slot picker, calendar, wizard, cart drawer.
- Errors are announced (`aria-live`), associated with fields (`aria-describedby`), never colour-only.
- Date picker and slot picker use accessible grid semantics; screen-reader labels include day, time, and availability.
- 3D canvas is `aria-hidden` with equivalent text/photo content; animations don't convey information that isn't also in text.
- Automated: `axe-core` in Playwright for every page; manual keyboard + screen reader pass at Phase 9.

**Performance budgets `[MUST]`**

| Metric | Target |
|---|---|
| LCP (mobile, 4G, mid-tier) | ≤ 2.5 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Initial JS (route, gzip) | ≤ 170 KB marketing pages, ≤ 220 KB app pages |
| Hero LCP image | ≤ 180 KB (AVIF, mobile) |
| Fonts | ≤ 2 families, variable, preloaded, ≤ 120 KB total |
| 3D chunk + model | Lazy; ≤ 250 KB gz JS + ≤ 1.5 MB model |
| API p95 (read) / (write) | ≤ 200 ms / ≤ 400 ms on target hosting |

Enforce via Lighthouse CI + `size-limit` in CI; a failing budget fails the build.

---
## 9. Page-by-page specifications

Every page must define **loading (skeleton), empty, error, and success** states, and meet the responsive rules in Section 7.

### 9.1 Homepage (`/`) — build in Phase 1

| # | Section | Content & behaviour |
|---|---|---|
| 1 | **Header** | Logomark + wordmark; nav (Grooming, Boarding, Veterinary, Supplies); search, favourites, cart (badge), account menu or "Sign in" |
| 2 | **Hero** | Eyebrow *"Considered care for dogs"*. Headline (`display-2xl`): *"Care that feels like home."* with *home* in italic Fraunces. Subhead: *"Grooming, boarding, vet visits and thoughtfully chosen supplies — one calm place for everything your dog needs."* CTAs: **Find care** (primary) · **Shop essentials** (secondary). Right: arch-framed dog photo, optional 3D dog layer, 2–3 floating context chips (e.g., *"Next grooming · Tue 10:30"*, *"Vaccines up to date"* — marked as sample UI). Below: **search composer** with tabs Grooming / Boarding / Vet / Supplies, location field, date field, **Search** button → routes with query params |
| 3 | **Values strip** | Four short value statements with line icons: *Vetted-by-process listings (demo: "Demo listings")*, *One pet profile for every booking*, *Clear prices before you book*, *Considered supplies*. **No fabricated statistics.** Counts, if shown, come from the database |
| 4 | **Services bento** | Four large photographic cards (Grooming, Boarding, Veterinary, Supplies) in asymmetric grid; hover reveals one-line description + arrow; each links to its page |
| 5 | **How it works** | Scroll-pinned 3-step story (GSAP): *Create a pet profile → Choose care → Book & manage*; left sticky copy, right parallax photo/UI-mock stack that changes per step |
| 6 | **Featured providers** | Horizontal rail of 6 `ProviderCard`s (photo, name, area, rating, price from, `Demo` badge); scroll-snap; arrow buttons; keyboard accessible |
| 7 | **Supplies preview** | Category chips (Food, Beds, Walks, Grooming, Toys, Health) + 4-up `ProductCard` rail with quick-add |
| 8 | **Pet profile feature** | Split section: floating `PetCard` UI (parallax layers) + copy about vaccination reminders and one-tap rebooking |
| 9 | **Sample stories** | 3 testimonial-style cards **clearly labelled "Sample stories"** until real reviews exist |
| 10 | **Care guides (editorial)** `[COULD]` | 3 article cards (markdown content), editorial photography |
| 11 | **CTA band** | Sage-900 background, ivory headline *"Start with your pet's profile."* + **Create account** |
| 12 | **Footer** | Link groups, newsletter (stored in DB, double-opt-in email when provider configured), legal links, photo credits, **Reduce motion** toggle, language/currency placeholder |

### 9.2 Grooming (`/grooming`, `/grooming/[slug]`)
- **Listing:** hero strip with photo + search; filters (location/radius, date, pet size, service type, price range, rating, "accepts cats"); sort (recommended, price, rating, distance); list + optional map (Leaflet/MapLibre with OSM tiles — `[COULD]`). `ProviderCard` shows photo, rating, price-from, next available slot (**computed from real slot data; for demo providers badge "Demo availability"**).
- **Detail:** gallery (arch hero + masonry), about, services table (name, duration, price by size tier), add-ons, policies (cancellation), reviews with rating distribution, location, sticky **Book** card (desktop) / sticky bottom bar (mobile).
- **Booking wizard:** Pet → Service & add-ons → Date & time → Review & confirm (Section 10).

### 9.3 Boarding (`/boarding`, `/boarding/[slug]`)
- **Listing:** date-range picker (check-in/out), number of pets, room type, filters (daily walks, outdoor access, medication support, 24/7 staff, vaccination policy), price/night.
- **Detail:** facility gallery, room types (capacity, nightly price, amenities), daily routine timeline, requirements (vaccines, temperament), policies, reviews, availability calendar showing real remaining capacity.
- **Booking wizard:** Dates → Pets → Room type → Care details (feeding schedule, medication, behaviour notes, emergency contact) → Review.

### 9.4 Veterinary (`/vet`, `/vet/[slug]`)
- **Listing:** clinics by location; filters (visit type, species, open today/weekends, price range).
- **Persistent safety banner:** *"For emergencies, contact your nearest emergency veterinary service immediately. PawNest appointments are not for emergencies."*
- **Detail:** clinic info, vets (name, specialty), appointment types (wellness exam, vaccination, sick visit, dental check, follow-up) with duration/price, hours, reviews.
- **Booking wizard:** Pet → Visit type & reason (symptoms checklist + notes) → Date & time → Review. Pre-fills last vaccination data from the pet profile.

### 9.5 Supplies (`/supplies`, `/supplies/[category]`, `/supplies/p/[slug]`)
- **Catalogue home:** editorial hero, category tiles, "New in", "Best for puppies/seniors", brand strip.
- **Listing:** filters (category, species, life stage, brand, price, in-stock, rating), sort, active filter chips, infinite scroll or pagination (URL-synced), skeleton grid, empty state.
- **PDP:** gallery (zoom, optional 3D viewer), title/brand, variant selector (size/flavour), price, stock status, delivery estimate (**labelled estimate**), add-to-cart, description, specs, ingredients/care, reviews, related products.
- **Cart drawer + `/cart`:** line items with qty steppers, remove, saved-for-later `[COULD]`, order summary (subtotal, shipping, tax, total), free-shipping progress bar (config-driven), guest cart persisted and merged on sign-in.
- **Checkout:** Address → Delivery → Payment → Review. Server re-quotes prices and stock before creating the order. Payment: Stripe test-mode Checkout **or** the labelled demo flow (Section 22).
- **Order detail:** status timeline, items, address, payment mode (`Demo — no payment taken` or `Paid via Stripe (test)`), invoice-style summary, cancel if allowed.

### 9.6 Pet profiles (`/dashboard/pets/*`)
- **List:** `PetCard` grid with avatar, name, breed, age, next reminder; "Add pet".
- **Create/edit form (multi-section):** basics (name, species, breed, sex, birthdate or approx age, weight, neutered), health (allergies, conditions, medications, vet clinic), behaviour (temperament tags, fears, notes), microchip number (optional), avatar upload with crop.
- **Detail:** header with avatar and age; tabs — Overview · Vaccinations (add/edit with due dates, status chips) · Bookings history · Documents `[COULD]`; reminder banner for vaccines due within 30 days.

### 9.7 Authentication (`/auth/*`)
- Split layout: left form on ivory, right arch photo (hidden on mobile).
- Sign-up: name, email, password (strength meter, show/hide), terms checkbox. Sign-in: email, password, "Forgot password". Email verification page with resend (rate-limited). Inline validation on blur, server errors mapped to fields, generic message on login failure (no user enumeration).
- Redirect-after-login preserves intended destination (`?next=`, validated as same-origin path).

### 9.8 Customer dashboard (`/dashboard/*`)
- **Overview:** greeting, **Upcoming** (next 3 bookings/appointments), **Pets** carousel with reminders, **Quick actions** (Book grooming, Boarding, Vet, Shop), **Recent orders**, **Activity feed** (notifications).
- **Bookings:** tabs Upcoming / Past / Cancelled; booking card with pet, provider, date/time, status chip, **Reschedule** and **Cancel** (policy-aware), detail page with timeline and receipt.
- **Appointments:** same component filtered `kind=VET`.
- **Orders:** list + detail with status timeline.
- **Favourites:** providers and products.
- **Settings:** profile, addresses, notification preferences, change password, export data, delete account (confirm dialog + password re-entry), reduce-motion toggle.

---

## 10. Key user flows

### 10.1 Grooming booking
1. User opens provider detail → **Book** → (if signed out) sign-in with `?next=`.
2. **Pet:** select pet (or add inline). Pet size/species drives price tier and service eligibility.
3. **Service & add-ons:** choose service; price recalculated by size tier.
4. **Date & time:** calendar + slot list from `GET /providers/:slug/availability`.
5. **Review:** price breakdown, policy, notes, consent checkbox.
6. **Confirm:** `POST /bookings` with `Idempotency-Key`. Server revalidates slot inside a transaction; on conflict returns `409 SLOT_TAKEN` and UI offers nearest alternatives.
7. Success screen; booking appears in dashboard; in-app notification created; confirmation email sent if mail provider configured.

### 10.2 Boarding booking
Dates → Pets (one or more) → Room type (capacity check per night across the stay) → Care details → Review → Confirm. Server verifies vaccine validity through the **check-out date**; failing pets show a blocking inline message with a link to update vaccinations.

### 10.3 Vet appointment
Pet → Visit type & reason → Slot → Review (emergency disclaimer acknowledgement) → Confirm. Appointment stored as `Booking(kind=VET)` with `visitType`, `symptoms[]`, `reason`.

### 10.4 Supplies purchase
Browse → PDP → Add to cart (guest or user) → Cart → Checkout (auth required; guest cart merges) → server creates `Order(PENDING)` with stock reservation inside a transaction → payment step (Stripe test Checkout **or** demo) → webhook/confirmation updates order → order page + dashboard entry.

### 10.5 Cancellation & reschedule
Policy-aware (default: free until 24 h before; after that, per provider policy shown before confirming). Reschedule = atomic cancel + create in one transaction, preserving the booking reference.

---

## 11. System architecture

```
┌────────────────────────────── Browser ──────────────────────────────┐
│ Next.js App Router UI (React 19, Tailwind v4, motion, GSAP, R3F)    │
└───────────────┬─────────────────────────────────────────────────────┘
                │ same-origin  /api/v1/*  (Next rewrite → API)
┌───────────────▼───────────────┐      ┌──────────────────────────────┐
│ apps/web (Next.js 15)         │      │ Static assets / images / GLB │
│ SSR/ISR, route handlers (BFF  │      │ (CDN, immutable caching)     │
│ for cookies only)             │      └──────────────────────────────┘
└───────────────┬───────────────┘
                │ HTTPS (cookies forwarded for SSR)
┌───────────────▼─────────────────────────────────────────────────────┐
│ apps/api (Fastify 5 + TypeScript, Zod type-provider)                │
│ modules: auth · users · pets · providers · bookings · products ·    │
│ cart · orders · notifications · uploads · admin · webhooks          │
│ plugins: cookies, cors, helmet, rate-limit, auth, error-handler,    │
│ swagger, request-id, idempotency                                    │
│ jobs: pg-boss (Postgres-backed queue; reminders, emails)            │
└───────┬───────────────────┬───────────────────┬─────────────────────┘
        │ Prisma            │ S3 API            │ HTTPS
┌───────▼───────┐   ┌───────▼────────┐   ┌──────▼─────────────────────┐
│ PostgreSQL 16 │   │ Object storage │   │ Stripe · Email (Resend/    │
│ (pg_trgm)     │   │ (R2 / S3 / MinIO)│  │ Postmark) · Sentry         │
└───────────────┘   └────────────────┘   └────────────────────────────┘
```

### 11.1 Technology choices

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Shared types, cached builds |
| Frontend | **Next.js 15 (App Router), React 19, TypeScript strict** | SSR/ISR, image optimisation, route transitions |
| Styling | **Tailwind CSS v4** + CSS variables + Radix primitives (shadcn/ui as a starting point, fully restyled) | Token-driven, accessible primitives |
| Motion | `motion`, GSAP ScrollTrigger, Lenis, View Transitions API | See Section 6 |
| 3D | three, @react-three/fiber, drei | Section 5 |
| Forms | react-hook-form + Zod (schemas shared) | Single validation source |
| Server state | TanStack Query v5 | Caching, optimistic updates |
| UI state | Zustand (cart drawer, wizard drafts) | Minimal global state |
| Backend | **Fastify 5 + TypeScript**, `fastify-type-provider-zod` | Fast, typed, OpenAPI from schemas |
| ORM / DB | **Prisma + PostgreSQL 16** | Migrations, typed queries, `pg_trgm` search |
| Jobs | **pg-boss** | No Redis dependency |
| Auth | Argon2id, JWT access (15 min) + rotating refresh token (30 d), httpOnly cookies | Section 16 |
| Payments | Stripe Checkout (test mode) behind a `PaymentProvider` interface + `DemoPaymentProvider` | Section 22 |
| Email | `MailProvider` interface: Resend/Postmark adapter + console/Mailpit adapter for dev | Swappable |
| Storage | `StorageProvider` interface: S3-compatible (R2/S3) + MinIO for local dev | Signed uploads |
| Testing | Vitest, Testing Library, Supertest/`fastify.inject`, Testcontainers (Postgres), Playwright, axe, Lighthouse CI | Section 19 |
| CI/CD | GitHub Actions | Section 21 |

### 11.2 Architecture rules
- **Layering in API modules:** `routes → controller (parse/validate) → service (business rules, authorization) → repository (Prisma)`. Controllers never touch Prisma directly.
- **Shared contracts:** `packages/shared` exports Zod schemas, inferred types, enums, and constants consumed by both apps.
- **Money:** integer minor units (`priceCents`) + ISO currency; formatted only at the UI edge.
- **Time:** all timestamps UTC in DB; providers carry an IANA `timezone`; slot math done server-side with `date-fns-tz`/Temporal polyfill.
- **Idempotency:** `Idempotency-Key` header supported on `POST /bookings`, `/orders`, `/checkout/session`; stored with request hash and response for 24 h.
- **Errors:** RFC 7807 `application/problem+json` with stable `code` (e.g., `SLOT_TAKEN`, `VALIDATION_FAILED`).
- **Observability:** pino JSON logs with `requestId`, Sentry on both apps, `/health` (liveness) and `/ready` (DB check).

---

## 12. Repository & folder structure

```
pawnest/
├─ apps/
│  ├─ web/
│  │  ├─ public/
│  │  │  ├─ models/            # hero-dog.glb (+ poster), product GLBs
│  │  │  ├─ images/            # processed derivatives (generated)
│  │  │  └─ fonts/             # only if not using next/font
│  │  ├─ assets-src/           # original photography (not deployed)
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (marketing)/    # page.tsx, about, help, contact, legal/*
│  │  │  │  ├─ (services)/     # grooming/, boarding/, vet/ (+ [slug])
│  │  │  │  ├─ (shop)/         # supplies/, supplies/p/[slug], cart, checkout
│  │  │  │  ├─ (auth)/auth/    # sign-in, sign-up, forgot/reset/verify
│  │  │  │  ├─ (app)/          # book/[kind]/[slug], orders/[id]
│  │  │  │  ├─ dashboard/      # layout + overview, pets, bookings, appointments, orders, favourites, settings
│  │  │  │  ├─ layout.tsx · error.tsx · not-found.tsx · loading.tsx
│  │  │  │  └─ sitemap.ts · robots.ts · opengraph-image.tsx
│  │  │  ├─ components/
│  │  │  │  ├─ ui/             # Button, Input, Select, Dialog, Sheet, Tabs, Toast, Skeleton, Badge, Avatar, Calendar, Stepper, Rating, Price...
│  │  │  │  ├─ layout/         # Header, Footer, MobileSheet, DashboardSidebar, BottomTabBar, Container, Section
│  │  │  │  ├─ motion/         # Reveal, Stagger, Parallax, Magnetic, PageTransition, SmoothScroll, CountUp, FlyToCart
│  │  │  │  ├─ media/          # Picture, ArchImage, ImageWithFallback, Hero3D, Hero3DCanvas, ProductViewer3D
│  │  │  │  ├─ home/           # Hero, SearchComposer, ValuesStrip, ServicesBento, HowItWorks, FeaturedProviders, SuppliesPreview, PetProfileFeature, SampleStories, CtaBand
│  │  │  │  ├─ providers/      # ProviderCard, ProviderGallery, ServiceList, ReviewList, FilterPanel, ProviderMap
│  │  │  │  ├─ booking/        # BookingWizard, StepPet, StepService, StepDateTime, StepCare, StepReview, SlotPicker, DateRangePicker, PriceSummary
│  │  │  │  ├─ shop/           # ProductCard, ProductGallery, VariantSelector, CartDrawer, CartLine, CheckoutForm, OrderTimeline
│  │  │  │  ├─ pets/           # PetCard, PetForm, VaccinationList, AvatarUploader
│  │  │  │  ├─ dashboard/      # UpcomingList, QuickActions, ActivityFeed, StatCard
│  │  │  │  └─ auth/           # SignInForm, SignUpForm, PasswordField, AuthShell
│  │  │  ├─ lib/
│  │  │  │  ├─ api/            # typed fetch client, query keys, hooks (per module)
│  │  │  │  ├─ auth/           # session helpers, route guards
│  │  │  │  ├─ motion/         # tokens, variants, useReducedMotion, scroll utils
│  │  │  │  ├─ three/          # loaders, lights, capability detection (canUse3D)
│  │  │  │  ├─ format/         # money, date, distance
│  │  │  │  └─ seo/            # metadata + JSON-LD helpers
│  │  │  ├─ stores/            # zustand: cart-ui, wizard-draft, motion-pref
│  │  │  ├─ content/           # image-manifest.json, copy, care-guides/*.md
│  │  │  ├─ styles/            # tokens.css, globals.css
│  │  │  └─ middleware.ts      # auth redirects (cookie presence only; real auth on API)
│  │  ├─ e2e/                  # Playwright specs + fixtures
│  │  ├─ next.config.ts · tailwind (v4 css) · tsconfig.json
│  │  └─ .env.example
│  └─ api/
│     ├─ prisma/
│     │  ├─ schema.prisma · migrations/ · seed/ (seed.ts, data/*.json)
│     ├─ src/
│     │  ├─ server.ts · app.ts
│     │  ├─ plugins/           # auth, cookies, cors, helmet, rate-limit, error-handler, swagger, request-id, idempotency
│     │  ├─ modules/
│     │  │  ├─ auth/ users/ pets/ providers/ bookings/ availability/
│     │  │  ├─ products/ categories/ cart/ orders/ checkout/
│     │  │  ├─ notifications/ favourites/ reviews/ uploads/ admin/ webhooks/
│     │  │  │   (each: routes.ts, controller.ts, service.ts, repository.ts, policies.ts, *.test.ts)
│     │  ├─ lib/               # prisma client, errors, money, time, pagination, crypto, logger
│     │  ├─ integrations/      # payment/, mail/, storage/ (interfaces + adapters)
│     │  ├─ jobs/              # reminders, email-send, cleanup-expired-reservations
│     │  └─ test/              # factories, testcontainers setup, authz matrix
│     └─ .env.example
├─ packages/
│  ├─ shared/                  # zod schemas, types, enums, constants, error codes
│  └─ config/                  # eslint, prettier, tsconfig bases
├─ docs/                       # PLAN.md (this file), DECISIONS.md, CHANGELOG.md, API.md, RUNBOOK.md
├─ infra/                      # Dockerfiles, render.yaml / fly.toml, github workflows templates
├─ .github/workflows/          # ci.yml, e2e.yml, lighthouse.yml, deploy-*.yml
├─ docker-compose.yml          # postgres, mailpit, minio
├─ turbo.json · pnpm-workspace.yaml · package.json · .env.example · README.md
```

---

## 13. Frontend component architecture & state

### 13.1 Layers
1. **Primitives (`ui/`)** — unstyled-logic (Radix) + token styling. No data fetching.
2. **Composites (`layout/`, `media/`, `motion/`)** — reusable, domain-agnostic.
3. **Feature components** — receive typed data via props or feature hooks.
4. **Pages** — compose features; Server Components fetch via the typed API client where possible; interactive parts are Client Components.

### 13.2 Conventions
- Components are typed with explicit props interfaces; variants use `class-variance-authority`.
- `"use client"` only where required (interaction, motion, 3D).
- Every data component has `Skeleton`, `Empty`, and `Error` siblings.
- Data hooks: `usePets()`, `useBookings(filters)`, `useAvailability(params)`, `useCart()`, etc., wrapping TanStack Query with keys from `lib/api/keys.ts`.
- **API client:** generated from OpenAPI (`openapi-typescript`) or hand-typed from `packages/shared`; handles `credentials: 'include'`, CSRF header, one silent refresh retry on `401 TOKEN_EXPIRED`, and problem+json error mapping.
- **Forms:** RHF + `zodResolver(sharedSchema)`; server field errors mapped into the form.
- **Cart:** server-backed when authenticated; guest cart in `localStorage` (`pawnest.cart.v1`) merged via `POST /cart/merge` on sign-in. Optimistic updates with rollback.
- **Wizard drafts:** Zustand + `sessionStorage`; cleared on confirmation.
- **Motion preference:** `useMotionPreference()` merges OS setting and in-app toggle; every animated component consumes it.

### 13.3 Key component contracts (examples)

```ts
// ProviderCard
interface ProviderCardProps {
  provider: ProviderSummary;           // from @pawnest/shared
  variant?: 'rail' | 'grid' | 'compact';
  showNextSlot?: boolean;
}

// SlotPicker
interface SlotPickerProps {
  slots: AvailabilitySlot[];           // { startsAt, endsAt, remaining }
  value?: string;                      // ISO start
  onChange(startsAt: string): void;
  timezone: string;                    // provider IANA tz
  isLoading?: boolean;
}

// Hero3D (client, lazy)
interface Hero3DProps {
  posterSrc: string;                   // same-aspect fallback
  modelSrc: string;
  onReady?: () => void;
}
```

---
## 14. Database schema

PostgreSQL 16 with Prisma. Extensions: `pg_trgm` (fuzzy search), `citext` (case-insensitive email). IDs are `cuid2`/UUID strings; money is integer minor units.

### 14.1 Entity overview

```
User ─┬─< Session
      ├─< Address
      ├─< Pet ─┬─< Vaccination
      │        └─< Booking >─ Provider ─┬─< Service
      ├─< Booking                       ├─< ProviderHours
      ├─< Review >─ Provider            ├─< BoardingUnit
      ├─< Favourite                     └─< Review
      ├─1 Cart ─< CartItem >─ ProductVariant >─ Product >─ Category
      ├─< Order ─< OrderItem
      ├─< Notification
      └─< EmailToken
```

### 14.2 Prisma schema (authoritative starting point)

```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  CUSTOMER
  ADMIN
}
enum Species {
  DOG
  CAT
  OTHER
}
enum PetSex {
  MALE
  FEMALE
  UNKNOWN
}
enum SizeTier {
  XS
  S
  M
  L
  XL
}
enum ProviderType {
  GROOMER
  BOARDING
  VET_CLINIC
}
enum BookingKind {
  GROOMING
  BOARDING
  VET
}
enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}
enum OrderStatus {
  PENDING_PAYMENT
  DEMO_PLACED
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
enum PaymentMode {
  DEMO
  STRIPE_TEST
  STRIPE_LIVE
}
enum EmailTokenType {
  VERIFY_EMAIL
  RESET_PASSWORD
}
enum FavouriteKind {
  PROVIDER
  PRODUCT
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique @db.Citext
  emailVerifiedAt DateTime?
  passwordHash  String
  name          String
  phone         String?
  role          Role     @default(CUSTOMER)
  reduceMotion  Boolean  @default(false)
  notifyEmail   Boolean  @default(true)
  notifyReminders Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  sessions      Session[]
  addresses     Address[]
  pets          Pet[]
  bookings      Booking[]
  reviews       Review[]
  favourites    Favourite[]
  cart          Cart?
  orders        Order[]
  notifications Notification[]
  emailTokens   EmailToken[]
  auditLogs     AuditLog[]
}

model Session {                       // refresh-token families with rotation + reuse detection
  id          String   @id @default(cuid())
  userId      String
  familyId    String
  tokenHash   String   @unique        // SHA-256 of opaque refresh token
  userAgent   String?
  ip          String?
  expiresAt   DateTime
  revokedAt   DateTime?
  replacedById String?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([familyId])
}

model EmailToken {
  id        String   @id @default(cuid())
  userId    String
  type      EmailTokenType
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, type])
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  label     String?
  recipient String
  line1     String
  line2     String?
  city      String
  region    String?
  postalCode String
  country   String  @db.Char(2)
  phone     String?
  isDefault Boolean @default(false)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Pet {
  id            String   @id @default(cuid())
  userId        String
  name          String
  species       Species
  breed         String?
  sex           PetSex   @default(UNKNOWN)
  birthDate     DateTime?
  approxAgeMonths Int?
  weightKg      Decimal? @db.Decimal(5,2)
  sizeTier      SizeTier?
  neutered      Boolean?
  microchipId   String?
  allergies     String[]
  conditions    String[]
  medications   String[]
  temperament   String[]
  fears         String[]
  notes         String?
  vetClinicName String?
  avatarKey     String?                // object-storage key, never a public URL
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?              // soft delete preserves booking history
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  vaccinations  Vaccination[]
  bookings      Booking[]
  @@index([userId, deletedAt])
}

model Vaccination {
  id          String   @id @default(cuid())
  petId       String
  name        String                   // Rabies, DHPP, Bordetella, FVRCP...
  administeredOn DateTime
  expiresOn   DateTime?
  vetName     String?
  notes       String?
  pet         Pet      @relation(fields: [petId], references: [id], onDelete: Cascade)
  @@index([petId, name])
}

model Provider {
  id          String   @id @default(cuid())
  slug        String   @unique
  type        ProviderType
  name        String
  tagline     String?
  description String
  addressLine String
  city        String
  region      String?
  country     String   @db.Char(2)
  lat         Float
  lng         Float
  timezone    String                    // IANA
  phone       String?
  websiteUrl  String?
  speciesAccepted Species[]
  amenities   String[]
  imageKeys   String[]
  ratingAvg   Decimal  @default(0) @db.Decimal(3,2)   // cached from Review
  ratingCount Int      @default(0)
  cancellationHours Int @default(24)
  autoConfirm Boolean  @default(true)   // v1: no provider portal
  isDemo      Boolean  @default(true)   // MUST be true for all seeded data
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  services    Service[]
  hours       ProviderHours[]
  units       BoardingUnit[]
  bookings    Booking[]
  reviews     Review[]
  @@index([type, city])
  @@index([lat, lng])
}

model ProviderHours {                   // recurring weekly hours
  id         String  @id @default(cuid())
  providerId String
  weekday    Int                       // 0=Sun..6=Sat
  opensAt    String                    // "09:00" provider-local
  closesAt   String                    // "17:30"
  stations   Int     @default(1)       // parallel capacity (groomers/vets)
  provider   Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  @@unique([providerId, weekday, opensAt])
}

model Service {
  id           String  @id @default(cuid())
  providerId   String
  kind         BookingKind
  name         String                  // "Full groom", "Annual wellness exam"
  description  String?
  durationMin  Int
  bufferMin    Int     @default(10)
  basePriceCents Int
  currency     String  @default("USD") @db.Char(3)
  sizePricing  Json?                   // { "XS":4500,"S":5500,... } overrides base
  species      Species[]
  isAddOn      Boolean @default(false)
  isActive     Boolean @default(true)
  provider     Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  bookings     Booking[]
  @@index([providerId, kind])
}

model BoardingUnit {                    // a room type with N identical rooms
  id            String @id @default(cuid())
  providerId    String
  name          String
  description   String?
  capacity      Int                     // number of rooms of this type
  maxPets       Int    @default(1)
  nightlyCents  Int
  currency      String @default("USD") @db.Char(3)
  amenities     String[]
  provider      Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  bookings      Booking[]
}

model Booking {
  id            String   @id @default(cuid())
  reference     String   @unique        // "PN-8K2F9Q"
  userId        String
  petId         String
  providerId    String
  serviceId     String?
  boardingUnitId String?
  kind          BookingKind
  status        BookingStatus @default(PENDING)
  startsAt      DateTime                // UTC; boarding = check-in
  endsAt        DateTime                // UTC; boarding = check-out
  priceCents    Int
  currency      String   @db.Char(3)
  priceBreakdown Json                   // line items snapshot
  addOnIds      String[]
  notes         String?
  // vet-specific
  visitType     String?
  symptoms      String[]
  reason        String?
  // boarding-specific
  careInstructions Json?                // feeding, meds, behaviour, emergency contact
  isDemo        Boolean  @default(true) // copied from provider at creation
  cancelledAt   DateTime?
  cancelReason  String?
  idempotencyKey String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id])
  pet           Pet      @relation(fields: [petId], references: [id])
  provider      Provider @relation(fields: [providerId], references: [id])
  service       Service? @relation(fields: [serviceId], references: [id])
  unit          BoardingUnit? @relation(fields: [boardingUnitId], references: [id])
  review        Review?
  @@index([userId, status, startsAt])
  @@index([providerId, startsAt, endsAt])
  @@unique([userId, idempotencyKey])
}

model Review {
  id         String  @id @default(cuid())
  userId     String
  providerId String
  bookingId  String  @unique            // one review per completed booking
  rating     Int                        // 1..5 (CHECK constraint)
  title      String?
  body       String?
  isSample   Boolean @default(false)    // seeded sample reviews are labelled
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
  provider   Provider @relation(fields: [providerId], references: [id])
  booking    Booking  @relation(fields: [bookingId], references: [id])
  @@index([providerId, createdAt])
}

model Category {
  id        String @id @default(cuid())
  slug      String @unique
  name      String
  parentId  String?
  sortOrder Int    @default(0)
  imageKey  String?
  parent    Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  products  Product[]
}

model Product {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  brand        String
  description  String
  details      Json?                    // ingredients, care, specs
  categoryId   String
  species      Species[]
  lifeStage    String[]                 // puppy, adult, senior
  tags         String[]
  imageKeys    String[]
  model3dKey   String?                  // optional GLB for viewer
  ratingAvg    Decimal  @default(0) @db.Decimal(3,2)
  ratingCount  Int      @default(0)
  isDemo       Boolean  @default(true)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  category     Category @relation(fields: [categoryId], references: [id])
  variants     ProductVariant[]
  @@index([categoryId, isActive])
}

model ProductVariant {
  id           String  @id @default(cuid())
  productId    String
  sku          String  @unique
  name         String                    // "2 kg / Chicken"
  priceCents   Int
  compareAtCents Int?
  currency     String  @default("USD") @db.Char(3)
  stock        Int                       // CHECK (stock >= 0)
  reserved     Int     @default(0)
  weightGrams  Int?
  product      Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems    CartItem[]
  orderItems   OrderItem[]
}

model Cart {
  id        String @id @default(cuid())
  userId    String @unique
  updatedAt DateTime @updatedAt
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
}

model CartItem {
  id        String @id @default(cuid())
  cartId    String
  variantId String
  quantity  Int                          // CHECK (quantity BETWEEN 1 AND 20)
  cart      Cart   @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  @@unique([cartId, variantId])
}

model Order {
  id            String   @id @default(cuid())
  number        String   @unique        // "PN-ORD-100042"
  userId        String
  status        OrderStatus
  paymentMode   PaymentMode
  paymentIntentId String?
  stripeSessionId String?  @unique
  currency      String   @db.Char(3)
  subtotalCents Int
  shippingCents Int
  taxCents      Int
  totalCents    Int
  shippingAddress Json                   // snapshot, not FK
  isDemo        Boolean  @default(true)
  idempotencyKey String?
  reservationExpiresAt DateTime?
  placedAt      DateTime @default(now())
  paidAt        DateTime?
  shippedAt     DateTime?
  deliveredAt   DateTime?
  cancelledAt   DateTime?
  user          User     @relation(fields: [userId], references: [id])
  items         OrderItem[]
  @@index([userId, placedAt])
  @@unique([userId, idempotencyKey])
}

model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  variantId   String
  productName String                      // snapshots
  variantName String
  sku         String
  unitPriceCents Int
  quantity    Int
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant     ProductVariant @relation(fields: [variantId], references: [id])
}

model Favourite {
  id        String @id @default(cuid())
  userId    String
  kind      FavouriteKind
  providerId String?
  productId  String?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, kind, providerId, productId])
}

model Notification {
  id        String @id @default(cuid())
  userId    String
  type      String                       // booking.confirmed, vaccination.due, order.shipped
  title     String
  body      String
  linkUrl   String?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt, createdAt])
}

model NewsletterSignup {
  id        String @id @default(cuid())
  email     String @unique @db.Citext
  confirmedAt DateTime?
  createdAt DateTime @default(now())
}

model IdempotencyRecord {
  key         String
  userId      String
  requestHash String
  responseStatus Int
  responseBody Json
  createdAt   DateTime @default(now())
  @@id([userId, key])
}

model AuditLog {
  id        String @id @default(cuid())
  userId    String?
  action    String                        // auth.login, booking.cancel, order.status_change
  entity    String?
  entityId  String?
  ip        String?
  meta      Json?
  createdAt DateTime @default(now())
  user      User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([entity, entityId])
}
```

### 14.3 Required raw-SQL migrations (Prisma `migrate` + custom SQL)
- `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS citext;`
- GIN trigram indexes on `Product(name, brand)` and `Provider(name, city)`.
- `CHECK` constraints: `rating BETWEEN 1 AND 5`, `stock >= 0`, `reserved >= 0 AND reserved <= stock`, `quantity BETWEEN 1 AND 20`, `endsAt > startsAt`.
- Optional hardening: a **partial unique index** preventing duplicate active bookings for the same pet with overlapping ranges (implemented as a service-level check inside a `SERIALIZABLE` transaction with retry; DB exclusion constraint via `btree_gist` is a `[COULD]`).

- **Prisma note:** `@db.Citext` and extension management may require `previewFeatures = ["postgresqlExtensions"]` and `extensions = [citext, pg_trgm]` in the datasource, depending on the Prisma version installed. If unavailable, store `email` lowercased with a unique index on `lower(email)`.
- **Favourite uniqueness:** because nullable columns are distinct in Postgres unique indexes, add two **partial unique indexes** in raw SQL: `(userId, providerId) WHERE kind='PROVIDER'` and `(userId, productId) WHERE kind='PRODUCT'`.

### 14.4 Availability model (no stored slots)
Slots are **computed**, not stored:
- **Appointments (grooming/vet):** for date D, take `ProviderHours` for weekday in provider timezone → generate start times every `service.durationMin + bufferMin` (or 15-min grid) → subtract overlap with non-cancelled bookings, bounded by `stations` capacity → drop past times and times < `minLeadMinutes` (default 120).
- **Boarding:** for each night in `[checkIn, checkOut)`: `remaining = unit.capacity − count(bookings overlapping that night)`; the stay is available only if `min(remaining) ≥ 1` for every night.

---

## 15. API specification

**Base:** `/api/v1` · JSON · camelCase · UTC ISO-8601 timestamps · OpenAPI at `/api/v1/openapi.json`, Swagger UI at `/api/docs` (disabled in production unless `ENABLE_DOCS=true`).
**Pagination:** `?limit=20&cursor=<opaque>` → `{ items, nextCursor }`.
**Errors:** `application/problem+json` → `{ type, title, status, code, detail, errors?: [{ field, message }], requestId }`.
**Auth legend:** 🌐 public · 🔐 authenticated owner-scoped · 🛡 admin.

### 15.1 Auth & account

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | Create account, send verification email |
| POST | `/auth/login` | 🌐 | Sets access + refresh cookies |
| POST | `/auth/refresh` | 🌐 (refresh cookie) | Rotates refresh token; detects reuse |
| POST | `/auth/logout` | 🔐 | Revokes session family, clears cookies |
| POST | `/auth/verify-email` | 🌐 | Consume token |
| POST | `/auth/resend-verification` | 🔐 | Rate-limited |
| POST | `/auth/forgot-password` | 🌐 | Always 202 (no enumeration) |
| POST | `/auth/reset-password` | 🌐 | Consume token, revoke all sessions |
| POST | `/auth/change-password` | 🔐 | Requires current password |
| GET | `/me` | 🔐 | Current user |
| PATCH | `/me` | 🔐 | Update profile/preferences |
| DELETE | `/me` | 🔐 | Delete/anonymise account (password re-check) |
| GET | `/me/export` | 🔐 | JSON export of user data |
| GET/POST | `/me/addresses` | 🔐 | List/create |
| PATCH/DELETE | `/me/addresses/:id` | 🔐 | Update/delete (owner only) |
| GET | `/dashboard/summary` | 🔐 | Upcoming items, reminders, recent orders, unread count |

### 15.2 Pets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/pets` | 🔐 | List own pets |
| POST | `/pets` | 🔐 | Create |
| GET | `/pets/:id` | 🔐 | Detail (owner only; otherwise **404**) |
| PATCH | `/pets/:id` | 🔐 | Update |
| DELETE | `/pets/:id` | 🔐 | Soft delete (blocked if future active bookings → `409`) |
| POST | `/uploads/presign` | 🔐 | Signed upload URL for pet avatar (type + size validated) |
| GET/POST | `/pets/:id/vaccinations` | 🔐 | List/create |
| PATCH/DELETE | `/pets/:id/vaccinations/:vid` | 🔐 | Update/delete |

### 15.3 Providers, services, availability, reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/providers` | 🌐 | Filter: `type, q, lat, lng, radiusKm, species, minPrice, maxPrice, minRating, amenities[], sort, cursor` |
| GET | `/providers/:slug` | 🌐 | Detail incl. hours, amenities, policies |
| GET | `/providers/:slug/services` | 🌐 | Active services & add-ons |
| GET | `/providers/:slug/availability` | 🌐 | `serviceId, date, petId?` → slots with `remaining` |
| GET | `/providers/:slug/boarding-availability` | 🌐 | `checkIn, checkOut, petCount` → per-unit availability + total price |
| GET | `/providers/:slug/reviews` | 🌐 | Paginated; includes `isSample` flag |
| POST | `/providers/:slug/reviews` | 🔐 | Only for the user's own COMPLETED booking |
| GET/PUT/DELETE | `/me/favourites` · `/me/favourites/:kind/:id` | 🔐 | Manage favourites |

### 15.4 Bookings & appointments (grooming, boarding, vet)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings/quote` | 🔐 | Server-side price & policy preview |
| POST | `/bookings` | 🔐 | Create (requires `Idempotency-Key`); validates pet ownership, species, slot/capacity, vaccines (boarding) in a transaction |
| GET | `/bookings` | 🔐 | `kind, status, from, to, cursor` — own only (vet appointments: `kind=VET`) |
| GET | `/bookings/:id` | 🔐 | Own only |
| POST | `/bookings/:id/cancel` | 🔐 | Policy-aware; returns applicable fee note |
| POST | `/bookings/:id/reschedule` | 🔐 | Atomic move; same reference |
| GET | `/vet/visit-types` | 🌐 | Static + provider-specific visit types |

### 15.5 Catalogue, cart, checkout, orders

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | 🌐 | Tree |
| GET | `/products` | 🌐 | Filter: `category, q, species, lifeStage[], brand[], minPrice, maxPrice, inStock, sort, cursor` |
| GET | `/products/:slug` | 🌐 | Detail + variants + stock status |
| GET | `/products/:slug/reviews` | 🌐 | Reviews |
| GET | `/cart` | 🔐 | Cart with live prices/stock flags |
| POST | `/cart/items` | 🔐 | `{ variantId, quantity }` (upsert) |
| PATCH/DELETE | `/cart/items/:id` | 🔐 | Update qty / remove (own cart only) |
| POST | `/cart/merge` | 🔐 | Merge guest cart payload (validated, capped) |
| POST | `/checkout/session` | 🔐 | Re-quote, reserve stock, create `Order(PENDING_PAYMENT)`; returns Stripe Checkout URL **or** demo confirmation token |
| POST | `/checkout/demo/confirm` | 🔐 | Only when `PAYMENT_MODE=demo`; sets `DEMO_PLACED` (never "paid") |
| POST | `/webhooks/stripe` | 🌐 (signature) | Verifies signature; idempotent; sets `PAID` |
| GET | `/orders` | 🔐 | Own orders |
| GET | `/orders/:id` | 🔐 | Own only |
| POST | `/orders/:id/cancel` | 🔐 | Only before `SHIPPED`; releases reservation |

### 15.6 Notifications, newsletter, admin, system

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | 🔐 | Paginated |
| POST | `/notifications/:id/read` · `/notifications/read-all` | 🔐 | Mark read |
| POST | `/newsletter` | 🌐 | Rate-limited signup |
| PATCH | `/admin/orders/:id/status` | 🛡 | Progress order status with audit log |
| PATCH | `/admin/bookings/:id/status` | 🛡 | Confirm/complete/no-show |
| GET | `/health` · `/ready` | 🌐 | Liveness / readiness |

---

## 16. Authentication & authorization

### 16.1 Authentication design
- **Passwords:** Argon2id (memory ≥ 19 MiB, t ≥ 2, p = 1); min length 10, breached-password check (k-anonymity HIBP) `[SHOULD]`; zxcvbn score ≥ 3 on the client as guidance.
- **Tokens:** access JWT (15 min, `HS256`/`EdDSA`, claims `sub, role, sid`) in `httpOnly; Secure; SameSite=Lax; Path=/` cookie `pn_at`; opaque 256-bit refresh token (30 days) in `httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie `pn_rt`, **hashed in DB**, rotated on every use; reuse of a rotated token **revokes the whole family**.
- **CSRF:** `SameSite` cookies + required `X-CSRF-Token` (double-submit, set via readable `pn_csrf` cookie) on all non-GET requests; `Origin` header check against allow-list.
- **Email verification:** required before booking/checkout (browse + cart remain allowed). Tokens single-use, 24 h expiry, stored hashed.
- **Password reset:** single-use token, 60 min expiry, revokes all sessions, generic responses.
- **Rate limits:** login 5/min/IP + 10/hour/account; register 5/hour/IP; forgot-password 3/hour/email+IP; general 120/min/IP. Exponential backoff after repeated failures.
- **Dev email:** Mailpit (SMTP on `localhost:1025`, UI `:8025`). **No real email sent** unless `MAIL_PROVIDER` is configured.

### 16.2 Authorization rules (enforced in the service layer on every request)
1. Derive `userId` **only** from the verified token — never from request body/params.
2. Every query on user-owned data includes `where: { userId: ctx.userId }` (use a `scopedRepo(userId)` helper so omission is impossible).
3. Accessing another user's resource returns **404** (not 403) to avoid ID enumeration.
4. Referenced foreign IDs in payloads (e.g., `petId` in `POST /bookings`, `variantId` in cart) are re-verified for ownership/validity server-side.
5. Admin routes require `role = ADMIN` **and** are audit-logged.
6. Prices, totals, availability, stock, and policy decisions are **always computed server-side**; client values are ignored.

### 16.3 Authorization test matrix (must exist as automated tests)

| Resource | Owner | Other user | Anonymous | Admin |
|---|---|---|---|---|
| `GET /pets/:id` | 200 | **404** | 401 | 404 (no impersonation in v1) |
| `PATCH/DELETE /pets/:id` | 200/204 | **404** | 401 | 404 |
| `POST /bookings` with someone else's `petId` | — | **404 / 422** | 401 | — |
| `GET/POST cancel /bookings/:id` | 200 | **404** | 401 | 404 |
| `GET /orders/:id` | 200 | **404** | 401 | 200 |
| `PATCH /cart/items/:id` (other cart) | 200 | **404** | 401 | 404 |
| `PATCH /me/addresses/:id` | 200 | **404** | 401 | 404 |
| `PATCH /admin/orders/:id/status` | 403 | 403 | 401 | 200 |
| `POST /providers/:slug/reviews` without completed booking | 422 | 422 | 401 | — |

---

## 17. Business rules & edge cases

| Area | Rule |
|---|---|
| **Double booking** | `SERIALIZABLE` transaction + retry (max 3); losing request gets `409 SLOT_TAKEN` + next 3 alternatives |
| **Lead time** | Minimum 120 min before start for grooming/vet; boarding check-in ≥ next day |
| **Species/size** | Service/provider must accept pet species; price tier from `sizeTier` (derived from `weightKg` if missing) |
| **Vaccines (boarding)** | Rabies + species core vaccines must be valid through check-out; missing → block with actionable message |
| **Overlapping pet bookings** | A pet can't hold two overlapping non-cancelled bookings |
| **Cancellation** | Free until `provider.cancellationHours` before start; later cancellations show provider policy; v1 does **not** charge fees (no real payments for services) |
| **Reschedule** | Allowed until the same cutoff; atomic |
| **Auto-confirm** | `autoConfirm` providers → `CONFIRMED` instantly, labelled *"Demo booking — not sent to a real provider"* while `isDemo` |
| **Reviews** | Only after `COMPLETED`; one per booking; seeded reviews flagged `isSample` and labelled |
| **Stock** | Reserve on checkout session (15 min TTL) via `reserved` column; release on expiry/cancel via job; no oversell |
| **Price drift** | If price/stock changed since cart view, checkout returns `409 CART_CHANGED` with diff; UI shows reconciliation dialog |
| **Cart limits** | Max 20 per line, 50 lines |
| **Shipping/tax** | Config-driven rules (flat rate + free threshold; tax rate by country), clearly labelled **estimates** in demo mode |
| **Timezones** | UI displays provider-local time with zone abbreviation; user-local shown on hover when different |
| **Account deletion** | Anonymise PII, retain order/booking records without PII for legal retention; revoke sessions |
| **Reminders** | Job sends in-app (and email if configured) 24 h before bookings and 30 days before vaccine expiry |

---

## 18. Security & privacy
- **OWASP ASVS L2** as the checklist. Validate all inputs with Zod at the edge; reject unknown fields (`strict()`).
- **Headers:** `helmet` + CSP (no inline scripts except nonce), HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off unless used), `X-Content-Type-Options`.
- **CORS:** explicit allow-list; credentials allowed only for the web origin.
- **Uploads:** presigned PUT with content-type allow-list (`image/jpeg|png|webp`), size ≤ 5 MB, server-side magic-byte verification, EXIF stripping, random object keys, private bucket + short-lived signed GET URLs.
- **Secrets:** only in environment variables / platform secret stores; never committed; `gitleaks` in CI. **Service-role or privileged keys are never exposed to client code.**
- **Logging:** never log passwords, tokens, full card data, or full PII; redact `authorization`, `cookie`.
- **Payments:** card data never touches PawNest servers (Stripe-hosted Checkout); webhook signature verified; idempotent handlers.
- **Dependencies:** `pnpm audit` and Dependabot weekly; lockfile committed.
- **Privacy:** privacy policy & cookie notice (only essential cookies in v1; analytics cookieless e.g., Plausible); data export and deletion endpoints.
- **Backups:** managed Postgres daily backups + point-in-time recovery enabled in production.

---
## 19. Testing strategy

### 19.1 Layers

| Layer | Tooling | What it covers | Gate |
|---|---|---|---|
| Static | ESLint, Prettier, `tsc --noEmit` (strict), `gitleaks` | Style, types, secrets | Every commit / PR |
| Unit | Vitest | Pricing, slot generation, policy functions, formatters, token rotation | ≥ 85% on `lib/` and `services/` |
| Component | Vitest + Testing Library + `jest-axe` | UI primitives, forms, SlotPicker, CartDrawer, reduced-motion variants | Every PR |
| API integration | Vitest + `fastify.inject` + **Testcontainers Postgres** | Every endpoint: happy path, validation, authz matrix, idempotency, concurrency | Every PR |
| E2E | **Playwright** (Chromium + WebKit + mobile emulation) | Journeys below | Every PR (smoke) / nightly (full) |
| Accessibility | `@axe-core/playwright` on every route | WCAG 2.2 AA violations = fail | Every PR |
| Visual regression | Playwright screenshots at 390 / 768 / 1440 | Homepage, listings, PDP, wizard, dashboard | Review diffs per PR |
| Performance | Lighthouse CI, `size-limit` | Budgets in Section 8 | Every PR |
| Security | `pnpm audit`, ZAP baseline (nightly) | Dependency & basic DAST | Nightly |
| Load smoke | k6 (50 VUs, booking + catalogue) | p95 targets, no 5xx | Pre-release |

### 19.2 Mandatory E2E journeys
1. Register → verify email (read from Mailpit) → sign in → sign out.
2. Forgot/reset password; old sessions invalidated.
3. Add pet with avatar and vaccination; edit; soft-delete blocked with future bookings.
4. Grooming: search → provider → book → appears in dashboard → reschedule → cancel.
5. Boarding: date range → room type → vaccine block → fix vaccine → book.
6. Vet: choose visit type → emergency acknowledgement → book.
7. Double-booking race: two sessions book the same last slot → exactly one succeeds, other sees alternatives.
8. Supplies: filter → PDP → add to cart as guest → sign in (merge) → checkout (demo) → order detail shows **"Demo — no payment taken"**.
9. Stripe test-mode checkout + webhook (only when keys available in CI secrets; otherwise skipped with explicit "SKIPPED: no credentials" report).
10. Authorization: user B cannot read/modify user A's pet, booking, order, address, cart item (matrix in 16.3).
11. Responsive: all journeys' key screens at 390 px and 1440 px; no horizontal scroll.
12. Reduced motion: hero static, no parallax, 3D off.
13. Error/loading/empty states: API 500 mocked, slow network (throttle), empty lists.
14. Keyboard-only run through booking wizard and cart.

### 19.3 Per-phase verification protocol (Antigravity must follow)
After each phase: run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:api && pnpm test:e2e`; open the app and manually exercise the phase's journeys at three widths; check the **browser console (no errors/warnings)** and **API logs (no unhandled errors)**; verify persistence by restarting the API and reloading; verify authorization with a second user account; record results in `docs/CHANGELOG.md`.

---

## 20. Phased implementation roadmap

Each phase lists **Scope → Tasks → Tests → Exit criteria**. Do not skip exit criteria.

### Phase 0 — Foundation & tooling
**Scope:** repository skeleton, tooling, CI, local environment.
**Tasks**
1. Initialise pnpm + Turborepo monorepo exactly per Section 12; strict TypeScript; ESLint/Prettier; Husky + lint-staged; Conventional Commits.
2. `docker-compose.yml` with Postgres 16, Mailpit, MinIO; `.env.example` files for root, web, api.
3. `apps/api`: Fastify app, plugins (cors, helmet, cookies, rate-limit, request-id, error-handler), `/health` and `/ready`, Prisma connected, initial migration (extensions).
4. `apps/web`: Next.js app, Tailwind v4 tokens (Section 3.9), fonts via `next/font`, base layout, Next rewrite `/api/v1/* → API_URL`.
5. `packages/shared` with first Zod schemas + error codes.
6. GitHub Actions: lint, typecheck, unit, API tests (Testcontainers), build, Playwright smoke, gitleaks.
7. `README.md` with exact run steps; `docs/PLAN.md` = this document.
**Tests:** CI green; `/health`, `/ready` tests; web renders a token showcase page.
**Exit criteria:** fresh clone → `docker compose up -d && pnpm i && pnpm db:migrate && pnpm dev` works; CI passes.

### Phase 1 — Design system & homepage (with hero)
**Scope:** premium design system and the full homepage with photography, motion, and optional 3D.
**Tasks**
1. Build `ui/` primitives (Section 13) with all states, keyboard support, and a `/styleguide` route (dev only).
2. Implement `Header`, `Footer`, `MobileSheet`, `Container`, `Section`, `Reveal/Stagger/Parallax/Magnetic/PageTransition/SmoothScroll`, `useMotionPreference`.
3. Image pipeline (Section 4.3): `Picture`, `ArchImage`, `ImageWithFallback`, manifest, build script, placeholder check.
4. Build homepage sections 1–12 (Section 9.1) with the hero choreography (Section 6.3).
5. 3D: implement `Hero3D` + capability detection + poster fallback behind `NEXT_PUBLIC_HERO_3D`. If no approved GLB exists, ship with a dev-only clearly-labelled stand-in or leave disabled.
6. Search composer routes to listing pages with query params (pages arrive later; show a branded "Coming in the next phase" state **only until Phase 4–7 complete**).
7. SEO basics: metadata, OG image, sitemap, robots, JSON-LD (Organization).
**Tests:** component tests (axe), visual screenshots at 3 widths, Lighthouse CI budgets, reduced-motion E2E, `canUse3D` unit tests (each gating condition).
**Exit criteria:** homepage meets LCP/CLS/INP budgets on mobile profile; no console errors; reduced-motion verified; responsive at 360–1920 without horizontal scroll; hero works with 3D off and on.

### Phase 2 — Authentication & account
**Scope:** secure auth end-to-end with persistence.
**Tasks:** Prisma models (User, Session, EmailToken, Address, AuditLog); register/login/refresh/logout/verify/reset/change-password; cookie + CSRF handling; auth plugin and `scopedRepo`; web forms (sign-up/sign-in/forgot/reset/verify), `AuthShell` UI, route guards (`middleware.ts` + server checks), account menu; settings page (profile, addresses, password, reduce-motion, export, delete); mail adapter (Mailpit/console) + templates.
**Tests:** unit (hashing, token rotation/reuse detection), API integration incl. rate limits, authz matrix rows for `/me*`, E2E journeys 1–2.
**Exit criteria:** sessions survive page reload and API restart; refresh reuse revokes family; no user enumeration; axe clean.

### Phase 3 — Pet profiles
**Scope:** full pet and vaccination management.
**Tasks:** Pet/Vaccination models; CRUD endpoints + authz; storage adapter + presigned avatar upload with validation; `PetForm`, `PetCard`, `VaccinationList`, `AvatarUploader` (crop); dashboard shell (sidebar/bottom tab) with `/dashboard/pets*`; vaccine status computation + reminder banner.
**Tests:** API (ownership, validation, soft delete, upload rules), component tests, E2E journey 3, authz matrix rows for pets.
**Exit criteria:** user B cannot access user A's pet or avatar; avatar served via signed URL only; data persists across restarts.

### Phase 4 — Providers, search & grooming booking
**Scope:** catalogue of (demo) providers, availability engine, grooming flow.
**Tasks:** Provider/Service/ProviderHours/Review/Favourite models; seed data (Appendix B) with `isDemo=true`; provider list/detail endpoints with filters + trigram search + distance; availability service (14.4) with unit tests; Booking model + create/quote/cancel/reschedule with idempotency and serializable transactions; web: `/grooming`, `/grooming/[slug]`, `BookingWizard` (pet → service → slot → review), `SlotPicker`, `PriceSummary`, dashboard bookings list/detail; notifications model + in-app feed.
**Tests:** slot-generation unit tests (timezones, DST, buffers, capacity), concurrency test (parallel `POST /bookings`), authz rows for bookings, E2E journeys 4 and 7.
**Exit criteria:** no double bookings under concurrent load test (≥ 50 parallel attempts, 1 slot); all booking records visible only to owner; labelled demo badges present everywhere.

### Phase 5 — Boarding
**Tasks:** BoardingUnit endpoints, nightly capacity logic, `DateRangePicker`, boarding detail/listing, wizard variant with care instructions, vaccine validation through check-out, price calculation per night/pet; dashboard displays stay timeline.
**Tests:** capacity unit tests (multi-night overlap), vaccine rule tests, E2E journey 5, authz.
**Exit criteria:** overbooking impossible; vaccine rule enforced server-side; labelled demo data.

### Phase 6 — Veterinary appointments
**Tasks:** vet services/visit types, symptom intake, emergency disclaimer & acknowledgement stored with booking, pet-profile prefill, `/vet*` pages, appointments dashboard tab, reminders job (pg-boss) for 24 h pre-visit.
**Tests:** API (intake validation, species rules), E2E journey 6, reminders job test with fake timers.
**Exit criteria:** emergency banner on all vet pages; appointments appear in dashboard filtered correctly; reminders created exactly once.

### Phase 7 — Supplies, cart, checkout & orders
**Tasks:** Category/Product/Variant/Cart/Order models; catalogue + search endpoints; PDP, listing with URL-synced filters; cart drawer + page; guest cart merge; checkout session with stock reservation + re-quote; `PaymentProvider` interface with `DemoPaymentProvider` and `StripePaymentProvider` (test mode, webhook); orders list/detail with timeline; admin status endpoints; optional `ProductViewer3D` for up to 5 products; reservation-expiry job.
**Tests:** stock concurrency (no oversell), price-drift 409, webhook idempotency/signature tests, E2E journeys 8–9, authz rows for cart/orders.
**Exit criteria:** demo orders **never** show "paid"; Stripe path works with test keys (or is documented as untested); stock correct after cancellations/expiry.

### Phase 8 — Dashboard unification & notifications
**Tasks:** `/dashboard` overview with `GET /dashboard/summary`; favourites (providers/products); notification centre; unified upcoming timeline across bookings/appointments/orders; settings polish; empty states with photography; reviews submission after completed bookings.
**Tests:** E2E on dashboard states (new user vs. rich data), authz, a11y.
**Exit criteria:** every core record type is reachable from the dashboard; counts match DB.

### Phase 9 — Polish: motion, accessibility, performance, SEO
**Tasks:** page transitions (View Transitions + fallback), fly-to-cart, favourite micro-interaction, skeleton/empty/error audit, copy pass, 404/500 pages, JSON-LD (LocalBusiness/Product/BreadcrumbList), OG images per provider/product, image optimisation audit, bundle audit, manual screen-reader + keyboard pass, reduced-motion audit, cross-browser pass (Chrome, Safari, Firefox; iOS Safari + Android Chrome).
**Tests:** full Playwright suite, Lighthouse CI on 10 key routes, axe on all routes, visual diffs reviewed.
**Exit criteria:** all budgets in Section 8 met; zero axe violations; no console errors on any route.

### Phase 10 — Hardening, documentation & deployment
**Tasks:** security review against Section 18; rate-limit tuning; Sentry; backups/restore drill; `RUNBOOK.md`; seed-safety guard (refuses to run in production without explicit flag); migration & rollback docs; production env checklist; deploy to staging, then production; smoke tests post-deploy; optional social login (Google) if credentials provided.
**Tests:** k6 load smoke, ZAP baseline, restore drill, post-deploy smoke E2E.
**Exit criteria:** staging passes the full E2E suite against deployed URLs; checklist in Section 21.5 complete.

---

## 21. Deployment & environment

### 21.1 Targets (recommended; swappable)
| Component | Recommended host | Notes |
|---|---|---|
| `apps/web` | **Vercel** (or any Node host/Docker) | Set `API_URL`; enable image optimisation |
| `apps/api` | **Render / Railway / Fly.io** (Docker) | Min 1 instance; health check `/ready`; run `pnpm db:deploy` as release command |
| PostgreSQL | **Neon / Supabase Postgres / Render PG** (managed, PITR) | Use **pooled** connection string for runtime, direct for migrations |
| Object storage | **Cloudflare R2 / S3** | Private bucket + CORS for presigned PUT from web origin |
| Email | **Resend / Postmark** | Verify sending domain (SPF, DKIM, DMARC) |
| Payments | **Stripe** | Test mode first; live only after legal/business review |
| Monitoring | **Sentry**, uptime check on `/ready` | Alerts to email/Slack |
| Analytics | **Plausible** (cookieless) | Optional |

Use a single registrable domain (e.g., `pawnest.example`, API at `api.pawnest.example` **or** same-origin rewrite) so cookies work; prefer the **same-origin rewrite** to avoid third-party-cookie issues.

### 21.2 Environment variables

**`apps/web/.env.example`**
| Variable | Example | Secret? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | No | Canonical URLs, OG |
| `API_URL` | `http://localhost:4000` | No (server-only) | Rewrite target / SSR fetch |
| `NEXT_PUBLIC_HERO_3D` | `false` | No | Feature flag for 3D hero |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | No | Shows demo labels/banner |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | *(empty)* | No | Optional analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | *(empty)* | No (DSN is public) | Error reporting |

**`apps/api/.env.example`**
| Variable | Example | Secret? | Purpose |
|---|---|---|---|
| `NODE_ENV` | `development` | No | Mode |
| `PORT` | `4000` | No | API port |
| `DATABASE_URL` | `postgresql://pawnest:pawnest@localhost:5432/pawnest` | **Yes** | Runtime DB (pooled in prod) |
| `DIRECT_URL` | same as above | **Yes** | Migrations |
| `WEB_ORIGIN` | `http://localhost:3000` | No | CORS/CSRF allow-list |
| `JWT_ACCESS_SECRET` | *(generate 64+ random bytes)* | **Yes** | Access token signing |
| `COOKIE_SECRET` | *(generate)* | **Yes** | Cookie signing |
| `COOKIE_DOMAIN` | *(empty in dev)* | No | Cookie scope |
| `PAYMENT_MODE` | `demo` | No | `demo` \| `stripe_test` \| `stripe_live` |
| `STRIPE_SECRET_KEY` | *(empty)* | **Yes** | Server-only |
| `STRIPE_WEBHOOK_SECRET` | *(empty)* | **Yes** | Webhook verification |
| `MAIL_PROVIDER` | `smtp` | No | `smtp` (Mailpit) \| `resend` \| `postmark` |
| `SMTP_URL` | `smtp://localhost:1025` | No | Dev mail |
| `RESEND_API_KEY` / `POSTMARK_TOKEN` | *(empty)* | **Yes** | Production mail |
| `MAIL_FROM` | `PawNest <hello@pawnest.example>` | No | Sender |
| `STORAGE_ENDPOINT` | `http://localhost:9000` | No | MinIO/R2/S3 endpoint |
| `STORAGE_BUCKET` | `pawnest-dev` | No | Bucket |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | `minioadmin` (dev only) | **Yes** | Storage credentials |
| `STORAGE_PUBLIC_BASE` | *(empty)* | No | Only if using public CDN for non-sensitive assets |
| `SEED_ALLOW_PRODUCTION` | `false` | No | Safety guard for seed script |
| `ENABLE_DOCS` | `true` (dev) | No | Swagger UI |
| `SENTRY_DSN` | *(empty)* | No | API error reporting |
| `LOG_LEVEL` | `info` | No | Logging |

**Rule:** privileged keys (Stripe secret, storage secret, DB URLs, JWT secrets) exist **only** in `apps/api` and the hosting platform's secret store. Add a CI check that fails if any `NEXT_PUBLIC_*` variable name contains `SECRET`, `KEY` (except `PUBLISHABLE`), or `TOKEN`.

### 21.3 Local development
```bash
git clone <repo> pawnest && cd pawnest
corepack enable && pnpm install
cp .env.example .env && cp apps/web/.env.example apps/web/.env.local && cp apps/api/.env.example apps/api/.env
docker compose up -d                 # Postgres 16, Mailpit (:8025), MinIO (:9001)
pnpm db:migrate                      # prisma migrate dev
pnpm db:seed                         # demo data (all flagged isDemo=true)
pnpm dev                             # web :3000, api :4000
pnpm test && pnpm test:api && pnpm test:e2e
```

### 21.4 Database migrations & seeding
- **Create:** `pnpm --filter api prisma migrate dev --name <change>`; commit the migration folder.
- **Deploy:** `pnpm --filter api prisma migrate deploy` (release command; never `migrate dev` in prod).
- **Rollback:** forward-only migrations; to revert, ship a corrective migration; restore from PITR for disasters (documented in `RUNBOOK.md`).
- **Seed:** `pnpm db:seed` is idempotent (upserts by slug/sku). In `NODE_ENV=production` it **refuses to run** unless `SEED_ALLOW_PRODUCTION=true`, and seeded rows always carry `isDemo=true`.

### 21.5 Production release checklist
- [ ] All env vars set via secret store; none committed; `NEXT_PUBLIC_*` audit passed
- [ ] `prisma migrate deploy` succeeded; `/ready` green
- [ ] HTTPS + HSTS; cookies `Secure`; CORS/CSRF origins correct
- [ ] Mail domain verified (SPF/DKIM/DMARC); test verification email delivered
- [ ] Storage bucket private; CORS restricted to web origin
- [ ] `PAYMENT_MODE` correct; if Stripe: webhook endpoint registered and tested in test mode
- [ ] Demo badges visible on all demo data (or real data loaded and `isDemo=false` reviewed)
- [ ] Sentry receiving events; uptime monitor active; backups verified
- [ ] Lighthouse + axe pass on production URL; post-deploy smoke E2E passes
- [ ] Legal pages reviewed by the owner (terms, privacy, cancellation)

### 21.6 Deploying
**Web (Vercel):** import repo → root `apps/web` → build `pnpm turbo build --filter=web` → set env vars → deploy → add domain.
**API (Render/Railway/Fly):** Dockerfile in `infra/api.Dockerfile` (multi-stage, non-root) → set env vars → release command `pnpm --filter api prisma migrate deploy` → health check `/ready` → scale ≥ 1 instance (jobs run in-process via pg-boss on the API; split to a worker service when load requires).
**CI/CD:** `main` → auto-deploy staging; tag `v*` → manual-approval production deploy; run post-deploy smoke tests.

---

## 22. Demo data & integration policy

PawNest v1 has **no real providers, no live availability feeds, and no real payments** unless the owner configures them. The product must be honest about that:

1. **All seeded providers, services, products, and reviews are fictional** and flagged `isDemo=true` / `isSample=true`. They display a **Demo** badge; a site-wide dismissible banner reads *"PawNest is running with demo data. Bookings and orders are not sent to real businesses."* when `NEXT_PUBLIC_DEMO_MODE=true`.
2. **No fabricated verification.** The UI never shows "Verified", "Licensed", or "Accredited" for demo providers. A real verification system is future work.
3. **Availability is computed from seeded hours and real stored bookings** and is labelled *"Demo availability"* — it is never presented as a live feed from a business.
4. **Payments:** in `demo` mode, checkout creates orders with `paymentMode=DEMO` and status `DEMO_PLACED`; copy says *"Demo order — no payment was taken."* Status is never `PAID`. With Stripe test keys, payment completes **only** after a verified webhook.
5. **Email/SMS:** if no provider is configured, messages go to Mailpit/console; the UI says *"Confirmation email not sent (email not configured)"* where relevant.
6. **Maps/geocoding:** use stored lat/lng from seed; no external geocoding calls without keys.
7. **No fake statistics, awards, press logos, or customer counts.**
8. Each integration is behind an interface (`PaymentProvider`, `MailProvider`, `StorageProvider`) with a demo/local adapter, so swapping to real providers requires configuration, not rewrites.

**Integrations requiring credentials or network access:** Stripe (payments), Resend/Postmark (email), Cloudflare R2/S3 (storage), Sentry (monitoring), Plausible (analytics), Google OAuth (optional), map tiles/geocoding (optional), Unsplash/Pexels/Adobe Stock (photography download), 3D asset marketplaces (model acquisition), hosting providers.

---

## 23. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **No approved realistic 3D dog asset** | Hero 3D delayed | Photographic hero ships first; 3D behind a flag; four sourcing routes (5.1) |
| **Image licensing mistakes** | Legal exposure | Manifest with licence per image; CI placeholder check; footer credits |
| **Booking race conditions** | Double bookings | Serializable transactions, retries, concurrency tests |
| **Timezone/DST bugs** | Wrong slot times | Provider IANA zones, server-side math, DST unit tests |
| **Animation hurts performance/accessibility** | Poor UX, a11y failures | Transform/opacity only, budgets in CI, reduced-motion paths tested |
| **Looks "template-y"** | Brand dilution | Strict adherence to design tokens, arch motif, editorial layouts, photography-led sections |
| **Scope creep** | Delays | `[COULD]` items cut first; provider portal explicitly out of v1 |
| **Fabricated trust signals** | Reputational/legal | Demo policy (Section 22) enforced in code review |
| **Secrets leakage** | Security | Env separation, gitleaks, `NEXT_PUBLIC_*` audit |
| **Stripe/email credentials unavailable during build** | Untestable integrations | Demo adapters + explicit "not tested" reporting |

---

## 24. Open questions & assumptions (decide when convenient; defaults noted)

| # | Question | Default assumption |
|---|---|---|
| 1 | Launch region and currency? | Config-driven; default `USD`, `en` locale; i18n-ready (no hard-coded strings in logic) |
| 2 | Final brand name/logo and domain? | "PawNest" wordmark in Fraunces + paw-in-arch mark; domain placeholder `pawnest.example` |
| 3 | Source of dog photography? | Owner supplies or approves licensed stock; shot list in Appendix A |
| 4 | Source of 3D dog asset? | Commission or license; flagged rollout |
| 5 | Will real providers be onboarded in v1? | No — seeded demo only; provider portal is v2 |
| 6 | Will real payments be taken in v1? | No — demo or Stripe test mode |
| 7 | Cats and other pets in v1? | Supported in data model and forms; photography is dog-led |
| 8 | Dark mode? | Out of v1 `[COULD]` |
| 9 | Languages? | English only in v1 |

---

## Appendix A — Photography shot list (starter set, 16 images)

| ID | Placement | Brief | Ratios | Notes |
|---|---|---|---|---|
| `hero-01` | Homepage hero (arch) | Golden retriever seated by a sunlit window, calm gaze, linen/oak textures | 4:5 + 3:4 | Negative space top-right; most important image |
| `hero-02` | Hero alt / auth page | Border collie mid-turn looking at camera, soft outdoor light | 4:5 | Backup hero |
| `svc-groom-01` | Services bento — Grooming | Close-up of hands brushing a poodle's coat on a neutral table | 4:3 | Hands only, no face |
| `svc-board-01` | Services bento — Boarding | Dachshund asleep on a cosy bed in a bright room | 4:3 | Warm light |
| `svc-vet-01` | Services bento — Vet | Calm vet's hand, stethoscope, relaxed lab on exam table | 4:3 | Clinical but warm; no logos |
| `svc-shop-01` | Services bento — Supplies | Flat-lay: leash, ceramic bowl, knit toy on ivory | 1:1 | Brand colours |
| `how-01..03` | How it works steps | (1) person on sofa with phone and dog; (2) groomer and dog; (3) dog at door with owner | 4:5 | Consistent grade |
| `pet-01` | Pet profile feature | French bulldog portrait, soft background | 1:1 | Used with UI overlay |
| `story-01..03` | Sample stories | Three different breeds/ages, incl. senior rescue | 1:1 | Natural expressions |
| `cta-01` | CTA band | Wide shot of dog and owner on a walk at golden hour | 21:9 | Dark-friendly crop |
| `empty-pets` | Empty states | Dog waiting at door, back view | 4:3 | Gentle humour OK, not childish |
| `product-*` | PDP/product cards | Cutout or backdrop shots, soft contact shadow | 4:5 | ≥ 3 per hero product |
| `provider-*` | Provider galleries | Facility interiors, grooming stations, boarding suites | 3:2 | Fictional demo facilities: use generic interiors, no real business signage |

## Appendix B — Seed data specification

- **Users:** `demo@pawnest.example` (customer, verified, password printed by the seed script in dev only), `admin@pawnest.example` (admin), `demo2@pawnest.example` (for authorization testing). Dev-only; the seed script **refuses** to create these in production.
- **Pets:** 3 for demo user (dog, dog, cat) with vaccinations (one due soon, one overdue) to exercise reminders and boarding blocks.
- **Providers (all `isDemo=true`, fictional names):** 8 groomers, 5 boarding facilities, 5 vet clinics across 2–3 fictional neighbourhoods with lat/lng, hours, services, size-tier pricing, cancellation windows.
- **Boarding units:** 2–3 room types per facility with capacities.
- **Reviews:** 5–12 per provider flagged `isSample=true`.
- **Catalogue:** 8 categories, 60 products, 1–4 variants each, mixed stock (some low, one out of stock), brands fictional.
- **Bookings/orders:** a few historical rows for the demo user to populate the dashboard (past completed booking enabling review flow; one delivered order).

## Appendix C — Environment limitations (kept separate from the plan)

These notes describe the environment in which **this plan was written (Claude's sandbox)** and do **not** limit the plan itself.

- The sandbox had no installable headless browser and blocked external hosts (image sites, Stripe, Supabase), so **no code was built, run, or visually verified there**, and no photography or 3D assets were downloaded or generated.
- Consequently this document contains **no screenshots, no verified Lighthouse results, and no tested code**. Colour contrast ratios are computed approximately and must be confirmed by axe in CI.
- Library versions (Next.js 15, React 19, Tailwind v4, Fastify 5, Prisma, Zod) reflect the intended stack; confirm current stable versions and API changes when installing, and record any deviations in `docs/DECISIONS.md`.
- Items requiring credentials or network in the implementing environment are listed in Section 22. The plan routes around all of them via demo adapters and feature flags so development is never blocked.

---

*End of plan. Begin at Phase 0.*   The attached document is the official PawNest Product, Design & Engineering Plan v1.0. Treat it as the source of truth.

Start implementation now.

1. Inspect the existing PawNest folder and Git status first.
2. Read the entire plan, especially Sections 3–9 for design, imagery, 3D, animations and page specifications; Sections 11–18 for architecture, database, APIs and security; and Section 20 for the implementation phases.
3. Complete Phase 0, Foundation & Tooling, and verify its exit criteria before starting Phase 1.
4. Then build the full premium homepage and design system, with high-quality dog imagery, the signature arch layout, elegant typography, polished transitions, and a working photographic hero with an optional 3D dog.
5. Continue through the remaining phases in order. Do not stop at a static mockup.
6. Follow the specified stack and folder structure unless a genuine environment limitation requires a documented alternative. Never claim that tests, integrations, or visual checks passed unless they were actually run.
7. If a licensed dog image or approved 3D model is unavailable, use the plan's clearly labelled fallback and document what is needed to complete it.

After each phase, report what was built, test results, unresolved issues, and the next phase. Begin with the repository audit, then proceed with implementation.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-13T22:15:25+05:30.
</ADDITIONAL_METADATA>