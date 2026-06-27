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
- **Models: Anthropic (Claude) default**, via the AI SDK (provider-agnostic). A free tier runs on our keys with a per-user quota; beyond it, pay or bring your own key (BYOK). BYO keys are stored AES-256-GCM-encrypted in Postgres and never returned to the client.
- **Runtime: `apps/api` (Hono/Bun) hosts the loop** as a long-running container — the streaming and live sandbox handles need a persistent process, not serverless. No separate worker or queue in v1.
- **Persistence: Drizzle + managed Postgres** — conversations, messages, per-user settings, sandbox handles, usage. Generation settings are global per-user.
- **Storage: Cloudflare R2** (S3-compatible) for rendered videos. The web streams them via short-lived presigned URLs; public share links resolve through their own unauthenticated route. Multi-cloud posture: managed Postgres + a container host, no single-cloud lock-in.
- **Narration via `manim-voiceover` + ElevenLabs** — the agent writes a `VoiceoverScene` that synthesizes speech in-scene during render, so animation timing auto-syncs to the narration; background music is ducked under it in a post-render ffmpeg step.

## Layout

```
apps/       # web (React/Vite SPA), api (Hono/Bun — auth + streaming agent loop)
packages/   # core (shared zod contracts + env), auth (Better Auth), db (Drizzle/Postgres), agent (the loop + Manim/sandbox tools + prompts)
```

> Shared config (`tsconfig.base.json`, `biome.jsonc`) lives at the repo root and is extended per package. Packages are **source-first** — no per-package build step; `apps/api` and the packages run `.ts` directly via Bun, and `apps/web` is the only thing Vite builds.

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
bunx vitest run    # run the test suite
```
