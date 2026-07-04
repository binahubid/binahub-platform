# Architecture Design

## Monorepo Structure

```
binahub-platform/
├── apps/
│   ├── web/          # Next.js — Associate Portal & Admin
│   └── api/          # Hono/Fastify — REST API
├── packages/
│   ├── shared/       # Utils, constants, helpers, api-client
│   ├── domain/       # Business entities & rules (pure TS)
│   ├── validation/   # Zod schemas for all entities
│   ├── database/     # Drizzle ORM, schema, migrations, seed
│   ├── ui/           # Shared React components (Radix + Tailwind)
│   └── ai/           # OpenAI/Anthropic integration
├── docs/             # Documentation
├── package.json      # Root workspace
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Key Decisions

- **Database**: PostgreSQL via Supabase, Drizzle ORM
- **Auth**: Supabase Auth (email/password)
- **API**: Hono (lightweight, fast, edge-ready)
- **Web**: Next.js 15 App Router, Tailwind CSS v4
- **UI**: Radix UI primitives + Tailwind
- **Validation**: Zod (shared between API & Web)
- **Monorepo**: pnpm workspaces + Turborepo
- **AI**: OpenAI for CV parsing & matching

## Modular Architecture

### apps/api — Domain-based modules

```
src/modules/
  auth/        # Register, login, session
  associates/  # CRUD associate profile
  profile/     # Public profile endpoints
  upload/      # File upload (CV, certificates)
  review/      # Admin review workflow
  search/      # Talent search & filter
  ai/          # CV parsing, matching
```

### apps/web — Feature-based structure

```
src/features/
  associate/   # Associate portal pages
  admin/       # Admin dashboard pages
  review/      # Review workflow UI
  profile/     # Profile display
  upload/      # Upload UI
```

## Data Flow

```
Web (Next.js) → API (Hono) → Database (Supabase)
                    ↕
            AI Service (OpenAI)
```
