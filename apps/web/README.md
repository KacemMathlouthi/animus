# @animus/web

The animus single-page app — landing, auth, and the studio (chat + conversation
sidebar + video panel), plus settings, legal, and the public `/v/:token` share
page. React 19 + Vite, React Router v7, Tailwind v4, shadcn/ai-elements.

This is the only workspace Vite builds; everything else runs `.ts` directly via
Bun. Run it from the repo root with `bun run dev` (Turborepo starts the web and
API together).

## Conventions

- **Tabs** for indentation (the rest of the repo uses 2 spaces); enforced by
  Biome/Ultracite.
- Talk to the API through `src/lib/api.ts` (`apiFetch`), which sends the session
  cookie and throws on non-2xx.
- Never import `@animus/core/env` here — a Biome rule blocks it. Shared contracts
  come from `@animus/core` (its pure root entry only).
- UI primitives in `src/components/ui` and `src/components/ai-elements` are
  vendored (shadcn / ai-elements). Add more with `bunx shadcn@latest add <name>`.

See the repo-root [`README.md`](../../README.md) and
[`CLAUDE.md`](../../CLAUDE.md) for architecture and the full contributor guide.
