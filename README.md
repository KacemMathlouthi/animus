# animus

Agent that produces narrated, research-grounded **Manim explainer videos** for any topic — mathematically precise, code-driven visuals with real narration.

animus is an **interactive coding agent for Manim videos** — think Claude Code, but in the cloud and specialized for explainer animations. You chat with it; it writes and edits Manim in a persistent cloud sandbox, renders, reads the errors / inspects frames, and repairs until the scene is clean — and you can interrupt and steer it at any turn. The product is this **render → diagnose → repair loop driven conversationally**, not one-shot codegen. Narration is generated independently (ElevenLabs) and muxed in, so we don't depend on `manim-voiceover`.

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
- **Sandbox: Daytona**, one per conversation, suspended between turns and resumed (~sub-second) on the next message via snapshots. Behind a thin adapter so E2B / Vercel Sandbox can slot in later. Pre-bake a `manim` + LaTeX snapshot to avoid per-turn cold installs.
- **Models: Anthropic (Claude) default**, via the AI SDK (provider-agnostic). A free tier runs on our keys with a per-user quota; beyond it, pay or bring your own key (BYOK). BYO keys are stored AES-256-GCM-encrypted in Postgres and never returned to the client.
- **Runtime: `apps/api` (Hono/Bun) hosts the loop** as a long-running container — the streaming and live sandbox handles need a persistent process, not serverless. No separate worker or queue in v1.
- **Persistence: Drizzle + managed Postgres** — conversations, messages, per-user settings, sandbox handles, usage. Generation settings are global per-user.
- **Storage: Cloudflare R2** (S3-compatible) for rendered videos. Multi-cloud posture: managed Postgres + a container host (e.g. EC2), no single-cloud lock-in.
- **Narration decoupled** from `manim-voiceover` — ElevenLabs directly, word-level timestamps, ffmpeg mux at assembly.

## Layout

```
apps/       # web (React/Vite SPA), api (Hono/Bun — auth + streaming agent loop)
packages/   # auth (Better Auth), db (Drizzle/Postgres), agent (the loop + Manim tools + sandbox)
```

> Shared config (`tsconfig.base.json`, `biome.jsonc`) lives at the repo root and is extended per package. Packages are added incrementally: `auth` and `db` exist today; `agent` lands with the first real generation work.

## Commands

```bash
bun install        # install workspace deps
bun run build      # turbo build
bun run dev        # turbo dev
bun run lint       # turbo lint
bun run typecheck  # turbo typecheck
bun run check      # ultracite check (lint, no writes)
bun run format     # ultracite fix (format + safe fixes)
bun run knip       # find unused files/deps/exports
```
