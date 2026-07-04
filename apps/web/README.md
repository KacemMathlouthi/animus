# @animus/web

The animus single-page app — landing, auth, and the studio (chat + conversation
sidebar + video panel), plus settings, legal, a 404 page, and the public
`/v/:token` share page. Routes set their own document title via the
`useDocumentTitle` hook, and the app defaults to dark mode. React 19 + Vite,
React Router v7, Tailwind v4, shadcn/ai-elements.

This is the only workspace Vite builds; everything else runs `.ts` directly via
Bun. Run it from the repo root with `bun run dev` (Turborepo starts the web and
API together).

The video player's resting poster (studio + share page) is the deterministic
brand **share card** (`src/components/share-card.tsx`, rendering
`@animus/core`'s `buildShareCardSvg` inline). `plugins/share-meta.ts` is a **dev
Vite plugin** that injects per-share Open Graph / Twitter meta into `index.html`
for `/v/:token` requests (crawlers don't run JS), and `vite.config.ts` proxies
`/api` so one origin serves the app and the crawler-fetched card/video/embed
URLs. In production that injection moves to an edge function / proxy — see the
meta-injection seam decision in [`CLAUDE.md`](../../CLAUDE.md).

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
