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
  web/    # React 19 + Vite SPA — landing, auth, studio (chat + conversation sidebar), settings, legal, /v/:token share page. plugins/ holds the dev link-preview meta-injection plugin (see the meta-injection seam decision).
  api/    # Hono/Bun — auth, settings, conversations, the streaming agent loop (/api/chat), and the public share endpoints (share-card og.png, video.mp4, embed). Long-running.
packages/
  core/   # shared contracts: zod schemas, types, constants + the deterministic share-card SVG builder + link-preview meta builders (pure root) + server env (/env subpath)
  auth/   # Better Auth (magic link via Resend, GitHub + Google OAuth, sessions)
  db/     # Drizzle + Postgres (schema, client, migrations)
  agent/  # the AI SDK agent loop, prompts, and the full tool set: HITL (askUserQuestion, finalizeVideoPlan), Exa web research (webSearch/webFetch), and the Manim sandbox tools (writeFile/editFile/runCommand/readFile/listFiles/renderScene). Ships the manim-video skill (skills/manim-video) and the prebaked snapshot Dockerfile.
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
  as `animus-manim:<tag>`; the tag currently in use is `SNAPSHOT_NAME` in
  `packages/agent/src/sandbox/index.ts` — `animus-manim:0.6`). The lifecycle lives
  in `packages/agent/src/sandbox` as plain functions
  (`ensureSandbox`/`destroySandbox`) returning the Daytona handle directly — the
  tools call the SDK natively (no wrapper adapter).
- **Models: Claude via Amazon Bedrock (default), with BYOK.** By default the
  agent resolves its model through `@ai-sdk/amazon-bedrock` — a Bedrock
  inference-profile id (`BEDROCK_MODEL`, e.g. `us.anthropic.claude-opus-4-6-v1`).
  The **code default** is Opus 4.6; **prod is expected to set `BEDROCK_MODEL`
  explicitly** on the `animus-api` Vercel project. Recommended prod value once
  Sonnet 5 model access is enabled in the Bedrock console:
  `us.anthropic.claude-sonnet-5` (~60% cheaper than Opus; the `@animus/core`
  pricing table already prices `claude-sonnet-5`, and `priceForModel`
  substring-matches the profile id, so metering stays correct). Leaving the env
  unset means prod silently runs the Opus default at Opus rates.
  Credentials are passed to the provider **explicitly** from the validated
  server env (`BEDROCK_ACCESS_KEY_ID`/`BEDROCK_SECRET_ACCESS_KEY`/
  `BEDROCK_REGION`, falling back to `AWS_*` so local `.env` files keep
  working): **never rely on the SDK's implicit `AWS_*` env chain in prod** —
  Vercel owns that namespace at runtime and shadows user-supplied values, which
  silently broke every chat turn once. The agent runs with `maxRetries: 6` —
  fresh-account Bedrock quotas 429 mid-turn and the default 2 retries abandons
  the loop (an AWS Service Quotas increase is the durable fix). Still
  provider-agnostic at the AI SDK layer.
  **BYOK is now wired into model selection** (`resolveModel` in
  `packages/agent/src/config`): a user may store an AES-256-GCM-encrypted LLM key
  (Anthropic / OpenAI / Google, with a curated tool-capable model) and/or an
  ElevenLabs narration key (`provider_key` rows discriminated by `kind`, never
  returned to the client — only a masked `provider + last4` preview). A brought
  key runs that component on the user's own account and is **not metered**.
- **Cost control: free credits → BYOK (see `docs/cost-control.md`, gitignored).**
  Each account starts with a $5 free grant (the `user_credits.balance_micros`
  default, mirrored by `FREE_GRANT_MICROS` in `@animus/core`). Turns are metered
  **per component** in integer micro-USD against a hardcoded price table
  (`@animus/core` pricing): the LLM unless the user brought their own key, and
  ElevenLabs TTS (narration chars, counted from the rendered scene) unless they
  brought one. The chat route refuses a metered turn at a non-positive balance
  (`402 OUT_OF_CREDITS`, surfaced by the web as a BYOK depletion dialog) and
  settles the real cost on finish — idempotent on the completed assistant message
  id (`usage_event`). Enforcement is **balance-only** (no mid-turn kill; a balance
  may end slightly negative). Optional `CREDITS_GLOBAL_CAP_USD` withholds new
  grants once total free spend is exceeded. The header shows the balance as a
  gauge ring around the avatar. Provider keys are verified with a cheap test call
  before they're stored. Quota tiers / paid billing remain future work.
- **Runtime:** `apps/api` (Hono/Bun) hosts the loop as a **long-running
  container** (streaming + live sandbox handles need a persistent process — not
  serverless). No separate worker/queue in v1.
- **Hosting (deployed): Vercel, container image for the API.** The web
  (`animus-web` project, Vite static + SPA fallback rewrite) and the API
  (`animus-api` project) both deploy on Vercel. The API ships as an **OCI
  container image** — `Dockerfile.vercel` at the repo root (project Root
  Directory = repo root; Container preset) runs `bun apps/api/src/server.ts`
  on `oven/bun`, so the source-first workspace resolves exactly as in local
  dev. The image is kept slim (~470MB): `apps/web` source is excluded from the
  build context (its `package.json` stays — the lockfile validates every
  workspace member) and the install is `--production`. Vercel's
  serverless-function pipeline is structurally incompatible with this monorepo
  (per-file transpile keeps `.ts` specifiers, packager rejects Bun's symlinked
  workspaces) — don't go back there. Ignore-file dialects differ:
  `.dockerignore` anchors bare names to the context root, `.vercelignore` uses
  gitignore semantics (a bare `assets` once stripped `apps/api/assets` at any
  depth and took prod down) — anchor root-only excludes with a leading `/`. Entry split:
  `src/app.ts` (pure Hono app) + `src/server.ts` (Bun bootstrap; disables the
  idle timeout on `/api/chat`). Postgres is **Neon** (free tier; the app uses
  the **pooled** `-pooler` URL, migrations run against the direct URL).
  Platform limits accepted for now: scale-to-zero after ~5 min idle (cold
  start) and the **function duration cap** — a hard 300s on the Hobby plan the
  team runs on (confirmed by the CLI; the Pro upgrade would raise it to 800s —
  relevant because renderScene alone allows 600s, so long render turns can be
  cut mid-stream today). Prod env vars live on the Vercel projects
  (`WEB_ORIGIN`/`BETTER_AUTH_URL` must be the deployed origins, not the
  localhost `.env` values; `VITE_API_URL` on the web is **build-time** — a
  redeploy is needed when it changes).
- **Domain & single origin (live): `tryanimus.app`** (bought on Vercel;
  Vercel nameservers/DNS). The web serves at `https://tryanimus.app`; the API
  has **no public domain of its own** — `apps/web/vercel.json` rewrites
  `/api/:path*` to the `animus-api` deployment, so browsers see one origin.
  That proxy is what makes auth cookies **first-party** (the two `*.vercel.app`
  hosts are distinct *sites* — vercel.app is on the Public Suffix List — so
  cross-origin cookies die with `state_mismatch`; don't split origins again).
  `VITE_API_URL`, `WEB_ORIGIN`, and `BETTER_AUTH_URL` all equal
  `https://tryanimus.app`. OAuth callbacks (GitHub app + Google client) point
  at `https://tryanimus.app/api/auth/callback/{github,google}` — GitHub allows
  one callback URL, so local dev OAuth needs a separate app. The API's
  `/health` (not under `/api/`) is reachable only via the deployment URL.
- **Email (live): Resend on `mail.tryanimus.app`** — verified via the
  Resend↔Vercel integration (DKIM + SPF + return-path MX on `send.mail.…`,
  auto-written into Vercel DNS, plus a monitor-mode DMARC record);
  `RESEND_FROM=animus <login@mail.tryanimus.app>`, so magic links deliver to
  any address. The **root** domain's MX slot is deliberately free for a future
  receiving mailbox (Zoho/ImprovMX).
- **Magic-link auth vs inbox scanners.** The verify endpoint consumes its
  single-use token on GET, and mail security scanners open every link in an
  arriving email — some executing JavaScript (proven in prod: an auto-redirect
  interstitial was defeated; paired verify hits ms apart in the logs). The
  email therefore links to `/auth/verify`, a page where only an **explicit
  button click** spends the token. If a scanner class that presses buttons
  ever appears, the endgame is Better Auth's `emailOTP` plugin (typed 6-digit
  codes — nothing clickable), which is also the more familiar UX.
- **Narration requires a paid ElevenLabs tier.** The free tier is 10k
  chars/month (≈2–3 videos) and restricts synthesis from datacenter IPs (the
  Daytona sandbox). TTS metering charges users for narration on the platform
  key, so a paid tier is a product prerequisite, not an optimization. In
  scenes, voices are selected by `voice_id` only — `manim-voiceover` matches
  `voice_name` exactly against the account's full display names and breaks
  otherwise (encoded in the prompt + skill).
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
- **Link previews & the SPA meta-injection seam (resolved).** A static SPA
  serves one `index.html` for every route, so per-share Open Graph / Twitter meta
  must be written **server-side at the real `/v/:token` URL** — crawlers don't run
  JS. The durable, deployment-agnostic parts live in `@animus/core`
  (`buildShareCardSvg`, `buildShareMetaTags`, `injectShareMeta`) and in the public
  API endpoints (`GET /api/share/:token/og.png` PNG card, `…/video.mp4` presigned
  redirect for `og:video`, `…/embed` iframe for `twitter:player`) — these never
  change with hosting. The **only** hosting-coupled piece is the *injection layer*,
  and both halves now exist: in dev a **Vite dev plugin**
  (`apps/web/plugins/share-meta.ts`) + an `/api` proxy in `vite.config.ts`; in
  prod the API's **`GET /api/share/:token/page`** route, which fetches the SPA
  shell from `WEB_ORIGIN` (cached ~5 min), splices in the meta block, and is
  wired to the real URL by a `/v/:token` rewrite in `apps/web/vercel.json`
  (placed before the SPA fallback). Both layers reuse the same pure core
  builders and the shared `SHARE_META_DESCRIPTION`. Humans still boot the SPA
  as normal; unknown tokens get the plain shell. Single origin also done:
  web + API sit behind `tryanimus.app` (the `/api` rewrite), so external
  viewers can play shared videos.

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
served by the public `GET /api/share/:token`, with share-to-socials) →
link-preview card ✓ (a deterministic, brand-only "share card" — an auth-style
50/50 split: title + "Made with animus" on the left, a curated painting picked by
hash on the right, derived at runtime from the title, nothing stored,
agent-independent — built once by `buildShareCardSvg` in
`@animus/core` and used on three surfaces: the studio player poster, the
share-page poster, and the Open Graph link-preview image rasterized via resvg +
bundled Geist at the public `GET /api/share/:token/og.png`. Real link previews are
served at the **natural `/v/:token` URL**: because a static SPA can't emit per-URL
meta, per-share OG/Twitter tags (`buildShareMetaTags`/`injectShareMeta` in
`@animus/core`) are injected into index.html server-side — a Vite dev plugin +
`/api` proxy in dev, and in prod the API's `GET /api/share/:token/page` route
behind a `/v/:token` rewrite (see the meta-injection decision above).
Previews include `og:video` + a `twitter:player` iframe embed
(`GET /api/share/:token/embed`) backed by a stable mp4 URL
(`GET /api/share/:token/video.mp4` → presigned redirect), so they play inline
where platforms allow — Discord/Telegram/Slack — and fall back to the card image +
click-through elsewhere) → observability ✓ (Braintrust LLM tracing over OpenTelemetry, gated on
`BRAINTRUST_API_KEY`) → prompt & craft alignment ✓ (the system prompt restructured
into a persona/operating prompt + always-on `manim-craft` rules, kept in lockstep
with the `manim-video` skill; snapshot bumped to 0.6) → landing/UX polish ✓
(dark-mode default, painted feature/hero backgrounds, use-cases section, 404 page,
per-route document titles via `useDocumentTitle`) → cost control ✓ (free-credit
metering + BYOK for LLM and ElevenLabs, per-component; balance-only enforcement
with a `402 OUT_OF_CREDITS` gate + depletion dialog; header balance gauge; see the
Cost-control decision above) → deployed to prod ✓ (tryanimus.app — container
image API + static web on Vercel behind one origin, Neon Postgres, Resend
email, GitHub/Google OAuth + magic-link live; see the Hosting/Domain/Email
decisions above) → **now:** first end-to-end prod video validation (blockers
found and fixed so far: Vercel shadowing `AWS_*`, Bedrock throttling →
retries, wrong voice guidance; still required: a paid ElevenLabs tier, an AWS
Bedrock quota increase) → playback polish → generalize the render/repair loop
→ later: paid quota tiers / billing, autonomous mode.
(Parked, deliberately: redacting sandbox secrets from tool output; surfacing
stream errors in the studio UI (a stream that dies after the 200 is committed
is invisible to status monitoring and silent in the UI); email OTP codes as
the magic-link endgame; the settings `music_track`/`voice_id`
nullable-vs-required mismatch; an atomic title-generation claim.)

---

## Stack

- **Runtime / package manager / test runner:** Bun (never npm/npx/node)
- **Monorepo:** Turborepo
- **Web:** React 19 + Vite, React Router v7, Tailwind v4, shadcn/ai-elements
- **API:** Hono
- **LLM:** Vercel AI SDK (`ai`), Claude served via Amazon Bedrock
  (`@ai-sdk/amazon-bedrock`)
- **Streaming markdown:** Streamdown
- **Validation:** Zod (all external input is schema-validated)
- **DB:** Drizzle ORM + Postgres
- **Auth:** Better Auth
- **Sandbox:** Daytona
- **Object storage:** Cloudflare R2
- **Link-preview image:** `@resvg/resvg-js` rasterizes the `@animus/core`
  share-card SVG to PNG for Open Graph (bundled Geist fonts + curated paintings in
  `apps/api/assets`)
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
