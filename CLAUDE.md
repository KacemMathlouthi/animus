# CLAUDE.md

Guidance for working in this repository. Keep this file current — it is the
single source of truth for what animus is and how we build it.

---

## What animus is

An **interactive coding agent for Manim videos** — Claude Code, but in the cloud
and specialized for narrated, research-grounded explainer animations. The user
chats with the agent; the agent writes and edits Manim code in a persistent
cloud sandbox, renders it, reads the errors / inspects frames, and repairs until
the scene is clean. The user can interrupt and steer at any turn (chat-only
steering — the agent owns the code). Narration uses `manim-voiceover` with
ElevenLabs, synthesized in-scene during render so the animation auto-syncs to the
speech; background music is mixed under it after rendering.

The mental model is a relocated Claude Code:

| Claude Code (local)        | animus (cloud)                                        |
| -------------------------- | ----------------------------------------------------- |
| Loop runs in your terminal | Loop runs in `apps/api`                               |
| Tools act on local files   | Tools act on a remote Daytona sandbox                 |
| Streams to the terminal    | Streams to the browser (SSE → `useChat` + Streamdown) |
| Ctrl-C to interrupt        | Abort the stream from the UI                          |
| General coding             | Manim tools + prompting, render-and-watch             |

The core insight: the **turn is ephemeral** (if it crashes or is interrupted,
the user just sends another message), and the **sandbox is the persistent
state** (the Manim project files live across turns).

---

## Monorepo layout

```
apps/
  web/    # React 19 + Vite SPA — landing, auth, studio (chat + conversation sidebar), settings, legal
  api/    # Hono/Bun — auth, settings, conversations, and the streaming agent loop (/api/chat). Long-running.
packages/
  core/   # shared contracts: zod schemas, types, constants (pure root) + server env (/env subpath)
  auth/   # Better Auth (magic link via Resend, GitHub + Google OAuth, sessions)
  db/     # Drizzle + Postgres (schema, client, migrations)
  agent/  # the AI SDK agent loop + tools (HITL + Exa web research) + prompts; Manim/sandbox tools land with generation work
```

Packages are **source-first**: no per-package build step. `apps/api` and the
packages run `.ts` directly via Bun; `apps/web` is the only thing Vite builds.
Cross-package "does it compile" = `bun run typecheck`.

---

## Architecture (locked decisions)

- **Interactive agent loop, not a batch pipeline.** Each user turn is an AI SDK
  tool-calling loop (`streamText` + Manim tools + `stopWhen`), streamed over SSE
  and interruptible. Durable execution (Vercel Workflow SDK) is **parked** for a
  future non-interactive "autonomous render" mode — it fights interactive streams.
- **Sandbox: Daytona**, one per conversation, suspended between turns and resumed.
  Sandboxes boot from a **prebaked snapshot** with Manim + ffmpeg + LaTeX already
  installed (no per-turn bootstrap). The snapshot is built from
  `packages/agent/snapshot/Dockerfile` via `bun run snapshot:build` (registers it
  as `animus-manim:<tag>`). The lifecycle lives in `packages/agent/src/sandbox`
  as plain functions (`ensureSandbox`/`destroySandbox`) returning the Daytona
  handle directly — the tools call the SDK natively (no wrapper adapter).
- **Models: Anthropic (Claude) default**, via the AI SDK (provider-agnostic).
  Free tier on our keys with a per-user quota → then pay or **bring your own key
  (BYOK)**. BYO keys stored AES-256-GCM-encrypted in Postgres, never returned to
  the client (only a masked `provider + last4` preview).
- **Runtime:** `apps/api` (Hono/Bun) hosts the loop as a **long-running
  container** (streaming + live sandbox handles need a persistent process — not
  serverless). No separate worker/queue in v1.
- **Persistence:** Drizzle + managed Postgres. Conversations and their message
  snapshots are persisted — the DB is authoritative: the client sends only the
  newest message and the completed turn is saved on finish, with titles
  generated asynchronously (Haiku). Generation settings are global per-user.
- **Storage:** Cloudflare R2 (S3-compatible) for rendered videos. Multi-cloud
  posture (managed Postgres + container host, no single-cloud lock-in).
- **Narration:** `manim-voiceover` + ElevenLabs. The agent writes a `VoiceoverScene`
  that synthesizes speech in-scene during render, so animation timing auto-syncs to
  the narration (`tracker.duration`, bookmarks). The ElevenLabs key is injected into
  the render sandbox via `envVars`. Background music is mixed under the narration in
  the post-render ffmpeg step.

**Roadmap:** shell ✓ (settings backend; conversation persistence with generated
titles; sidebar list/search/rename/delete) → streaming chat ✓ (`/api/chat` →
`useChat` + Streamdown, real agent loop with HITL + Exa web-research tools) →
first Manim scene end-to-end via Daytona ✓ → R2 video storage ✓ (rendered mp4s
live in R2; the agent's renderScene returns an object key, the web streams via
short-lived presigned URLs minted by `/api/media/sign`, and a conversation's
objects are deleted with it) → background music ✓ (renderScene fetches a track
from R2 at render time and mixes it under the video via ffmpeg, with a fallback;
fixed key for now, user-configurable later) → narration ✓ (manim-voiceover +
ElevenLabs; the agent writes a VoiceoverScene that auto-syncs to the speech, key
injected into the sandbox, music ducked under it) → share & export ✓ (Publish
menu downloads the mp4 via an attachment-disposition presign and mints a
permanent unlisted public share — `video_share` token → `/v/:token` branded page
served by the public `GET /api/share/:token`, with share-to-socials) → **next:**
playback polish → generalize the render/repair loop
→ later: quota/billing, autonomous mode. (Outstanding before the chat phase fully
closes: an atomic title-generation claim. HTTP-level route tests for
`conversations` + the `/api/chat` sync contract now exist.)

---

## Stack

- **Runtime / package manager / test runner:** Bun (never npm/npx/node)
- **Monorepo:** Turborepo
- **Web:** React 19 + Vite, React Router v7, Tailwind v4, shadcn/ai-elements
- **API:** Hono
- **LLM:** Vercel AI SDK (`ai`)
- **Streaming markdown:** Streamdown
- **Validation:** Zod (all external input is schema-validated)
- **DB:** Drizzle ORM + Postgres
- **Auth:** Better Auth
- **Sandbox:** Daytona
- **Object storage:** Cloudflare R2
- **Logging:** Pino (structured)
- **LLM observability:** Braintrust via OpenTelemetry (AI SDK
  `experimental_telemetry` → OTLP). Gated on `BRAINTRUST_API_KEY`; no-op when
  unset. Init in `apps/api/src/observability/telemetry.ts`; per-turn settings
  built by `aiTelemetry()` and passed into the agent + title generation.
- **Retries:** `p-retry` (for external calls — Daytona, model providers)
- **Lint / format:** Ultracite + Biome
- **Dead-code / deps:** Knip

---

## Commands

```bash
bun install            # install workspace deps
bun run dev            # turbo dev (all apps)
bun run build          # turbo build (web app)
bun run typecheck      # tsc across every workspace — the cross-package compile check
bunx ultracite check   # lint (no writes); `bunx ultracite fix` to auto-fix
bun run knip           # unused files / deps / exports
bunx vitest run        # run tests (NOT `bun test`)
```

Database (`packages/db`):

```bash
bun run db:generate    # create a migration from schema changes
bun run db:migrate     # apply migrations
bun run db:studio      # Drizzle Studio
```

Sandbox snapshot (`packages/agent`):

```bash
bun run snapshot:build # build/refresh the prebaked Manim+LaTeX Daytona snapshot
```

**Before committing, the change must pass:** `bun run typecheck`,
`bunx ultracite check`, `bun run knip`, and `bunx vitest run`.

---

## Coding rules for contributors

- **No `any`** — use `unknown` + narrowing.
- **Public functions require explicit return types.**
- Async/await style preferred.
- **All external inputs must be schema-validated** (Zod). Keep services stateless
  per request.
- Retry transient external failures (`p-retry`); never blindly retry
  abort/timeout.
- Use structured logs: `logger.info({ ...ctx }, "message")`.
- **No dead code**, no commented-out blocks, no unreferenced wiring. If a feature
  is added, wire it fully and test it in the same change.
- **Every change (feature, fix, refactor) includes corresponding test additions
  or updates** — untested code is incomplete code.
- Use `bun` commands only.

---

## Testing standards

The test suite uses **vitest** and every new module ships with its tests in the
same change. Current coverage spans `@animus/core` schemas, the API routes
(conversations, settings, media, share, and the `/api/chat` sync contract) and
their services + middleware, the crypto egress gate (encrypt/decrypt round-trip),
the agent runner + tools + title generation, and `@animus/auth` email delivery.
Declarative/trivial modules (schema DDL, barrels, config constants, Better Auth
wiring) are intentionally not unit-tested.

### Test runner
- Use `vitest` (not `bun test`). Run: `bunx vitest run`.
- Keep tests close to source in `__tests__/` folders.
- Shared helpers in `src/__tests__/helpers/` (mock-logger, mock-fetch, fixtures).
- For deterministic LLM behavior in agent tests, use the mock providers from
  `ai/test` (`MockLanguageModelV3`, `mockId`) together with
  `simulateReadableStream` from `ai` (it now lives in the main entry — the
  `ai/test` re-export is deprecated).

### Mandatory test policy
- **Every bug fix must include a test** that reproduces the bug and verifies the fix.
- **Every new feature must include tests** covering its public API, error paths,
  and edge cases.
- **Every refactor that changes behavior must update affected tests.**
- **No PR is complete without passing tests** — run `bunx vitest run` before committing.
- When modifying an existing module, review its `__tests__/` folder and update
  affected tests.

---

## Principles

### Completeness — boil the lake

AI-assisted coding makes the marginal cost of completeness near-zero. When
presenting options, if Option A is the complete implementation (full parity, all
edge cases, 100% coverage) and Option B is a shortcut that saves modest effort,
**recommend A** — the delta between 80 and 150 lines is meaningless here.

A **lake** is boilable: 100% coverage for a module, full feature implementation,
all edge cases, complete error paths. An **ocean** is not: rewriting a system
from scratch, features in dependencies we don't control, multi-quarter
migrations. **Boil lakes; flag oceans as out of scope.** Don't skip the last 10%
to "save time" — with AI it costs seconds. Don't defer tests to a follow-up PR;
tests are the cheapest lake to boil.

### See something, say something

Whenever you notice something that looks wrong during any step — not just test
failures — flag it briefly (one sentence: what you noticed and its impact), then
ask "Want me to fix it?" Never let a noticed issue silently pass.

### Keep CLAUDE.md up to date

Update this file and relevant docs after every phase or coding session. It must
reflect the current reality of the codebase at all times.

### Ask questions on ambiguity

Whenever there is ambiguity in requirements, approach, or scope, ask. Don't
assume — confirm.

---

## Project conventions

- **Formatting is enforced by Biome/Ultracite.** `apps/web` uses **tabs**;
  `apps/api` and `packages/*` use **2-space** indent. Run `bunx ultracite check`
  before committing.
- **No TS `enum`** (`erasableSyntaxOnly`) — use `as const` arrays + union types.
- **`verbatimModuleSyntax`** — type-only imports must use `import type` / inline
  `type`.
- **Shared contracts live in `@animus/core`.** Its root entry is **pure**
  (no `process.env`, no `node:*`, no side effects) so the web can import it.
  Server env is behind `@animus/core/env` — **never import it from the web**
  (enforced by a Biome `noRestrictedImports` rule in `apps/web`).
- **Env:** loaded by the runtime (Bun `--env-file`, Vite for web), validated by
  Zod in `@animus/core/env`. Never read `process.env` directly in **runtime
  app/server code** — import from `@animus/core/env`. Build-time tooling configs
  (e.g. `drizzle.config.ts`) are the exception: they run via `--env-file`, need
  only `DATABASE_URL`, and must not pull in the full server-env schema.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`,
  `chore:`). No AI attribution / `Co-Authored-By` lines.
