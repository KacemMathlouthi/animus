# animus

Agent that produces narrated, research-grounded **Manim explainer videos** for any topic — mathematically precise, code-driven visuals with real narration.

animus is an **interactive coding agent for Manim videos** — think Claude Code, but in the cloud and specialized for explainer animations. You chat with it; it writes and edits Manim in a persistent cloud sandbox, renders, reads the errors / inspects frames, and repairs until the scene is clean — and you can interrupt and steer it at any turn. The product is this **render → diagnose → repair loop driven conversationally**, not one-shot codegen. Narration uses `manim-voiceover` + ElevenLabs, synthesized in-scene during render so animation timing auto-syncs to the speech; background music is mixed under it afterward. Finished videos can be downloaded or shared via a public link.

## Stack

- **Bun** — package manager + runtime
- **Turborepo** — task orchestration / caching
- **Ultracite + Biome** — lint + format
- **Knip** — dead code / unused dependency detection
- **TypeScript** — strict, project-wide
- Built on the **AI SDK**

## Architecture decisions (locked)

See [`CLAUDE.md`](CLAUDE.md) for the full decision record, stack, and contributor guide.

- **Interactive agent loop, not a batch pipeline.** Each user turn runs an AI SDK tool-calling loop (`streamText` + Manim tools + `stopWhen`), streaming tokens and tool calls to the browser over SSE, fully interruptible. The persistent state is the **sandbox**, not a durable run. (Durable execution / Workflow SDK is parked for a later non-interactive "autonomous render" mode.)
- **Sandbox: Daytona**, one per conversation, suspended between turns and resumed (~sub-second) on the next message via snapshots. Sandboxes boot from a prebaked `manim` + ffmpeg + LaTeX snapshot, so there's no per-turn cold install. The tools call the Daytona SDK natively (no wrapper adapter).
- **Models: Claude via Amazon Bedrock**, through the AI SDK (`@ai-sdk/amazon-bedrock`) — the agent runs on a Bedrock inference profile (`BEDROCK_MODEL`), with credentials passed to the provider **explicitly** from validated env (`BEDROCK_*`, falling back to `AWS_*` for local dev — Vercel shadows user-supplied `AWS_*` names at runtime, so the implicit credential chain must not be relied on in prod). Still provider-agnostic at the AI SDK layer. **BYOK is live**: a user may store an encrypted LLM key (Anthropic/OpenAI/Google) and/or an ElevenLabs key; a brought key runs that component unmetered on their own account.
- **Runtime: `apps/api` (Hono/Bun) hosts the loop** as a long-running container — the streaming and live sandbox handles need a persistent process, not serverless. No separate worker or queue in v1.
- **Persistence: Drizzle + managed Postgres** — conversations, messages, per-user settings, sandbox handles, usage. Generation settings are global per-user.
- **Storage: Cloudflare R2** (S3-compatible) for rendered videos. The web streams them via short-lived presigned URLs; public share links resolve through their own unauthenticated route. Multi-cloud posture: managed Postgres + a container host, no single-cloud lock-in.
- **Narration via `manim-voiceover` + ElevenLabs** — the agent writes a `VoiceoverScene` that synthesizes speech in-scene during render, so animation timing auto-syncs to the narration; background music is ducked under it in a post-render ffmpeg step.
- **Share & link previews** — a finished video gets a permanent unlisted `/v/:token` page plus a deterministic, brand-only **share card** (title + a curated painting, derived at runtime, nothing stored) used as the player poster and, rasterized to PNG, the Open Graph image. Real previews (with inline `og:video` / `twitter:player`) are injected into `/v/:token` server-side — a Vite dev plugin in dev, and in prod the API's `GET /api/share/:token/page` behind a `/v/:token` rewrite in `apps/web/vercel.json`. Both layers reuse the same pure builders in `@animus/core`. See [`CLAUDE.md`](CLAUDE.md).
- **Cost control: free credits + metering** — each account starts with a $5 grant; turns are metered per component (LLM tokens, TTS characters) in micro-USD unless the user brought their own key. Balance-only enforcement with a 402 gate; paid tiers are future work.
- **Deployed: [tryanimus.app](https://tryanimus.app)** — web (Vite static) and API (an OCI container image running the Bun server, `Dockerfile.vercel`) both on Vercel behind **one origin**: the web project rewrites `/api/*` to the API so auth cookies stay first-party. Postgres on Neon, videos on R2, transactional email via Resend on `mail.tryanimus.app`. The full decision record (and the serverless dead-ends not to revisit) is in [`CLAUDE.md`](CLAUDE.md).
- **LLM observability via Braintrust** — the agent's AI SDK calls emit OpenTelemetry traces exported to Braintrust when `BRAINTRUST_API_KEY` is set; a no-op otherwise.

## Layout

```
apps/       # web (React/Vite SPA), api (Hono/Bun — auth + streaming agent loop)
packages/   # core (shared zod contracts + env), auth (Better Auth), db (Drizzle/Postgres), agent (the loop + Manim/sandbox tools + prompts)
```

> Shared config (`tsconfig.base.json`, `biome.jsonc`) lives at the repo root and is extended per package. Packages are **source-first** — no per-package build step; `apps/api` and the packages run `.ts` directly via Bun, and `apps/web` is the only thing Vite builds.

## Getting started

```bash
cp .env.example .env   # fill in what you have; see the notes in the file
docker compose up -d   # Postgres on :5432, matching DATABASE_URL above
bun install
cd packages/db && bun run db:migrate && cd ../..   # required before the API serves
bun run dev            # web on :5173, api on :8787
```

The API validates its env at boot, so `ELEVENLABS_API_KEY` and the four `R2_*`
vars must be present (any non-empty value) even if you never render — a known
rough edge for contributors. `DAYTONA_API_KEY` and `EXA_API_KEY` are genuinely
optional and only resolve when a turn needs the sandbox or web research. Without
`RESEND_API_KEY`, magic links are printed to the API console instead of emailed,
which is enough to sign in locally.

## Commands

```bash
bun install        # install workspace deps
bun run build      # turbo build (web only)
bun run dev        # turbo dev
bun run typecheck  # tsc across every workspace — the cross-package compile check
bun run check      # ultracite check (lint + format, no writes) — repo-wide
bun run format     # ultracite fix (format + safe fixes)
bun run knip       # find unused files/deps/exports
bunx vitest run    # run the test suite (not `bun test`)
```

> `bun run lint` only has an effect in `apps/web` — it is the sole workspace
> with a `lint` script. `bun run check` is the repo-wide linter.
