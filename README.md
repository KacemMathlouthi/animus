# anima

Agent that produces narrated, research-grounded **Manim explainer videos** for any topic — mathematically precise, code-driven visuals with real narration.

The product is the **render → diagnose → repair loop**, not one-shot codegen: the agent writes Manim in a sandbox, renders it, parses errors / inspects frames, and repairs until the scene is clean. Narration is generated independently and muxed in, so we don't depend on `manim-voiceover`.

## Stack

- **Bun** — package manager + runtime
- **Turborepo** — task orchestration / caching
- **Ultracite + Biome** — lint + format
- **Knip** — dead code / unused dependency detection
- **TypeScript** — strict, project-wide
- Built on the **AI SDK**

## Architecture decisions (locked)

- **Sandbox: Daytona first**, behind a provider-agnostic interface (Vercel Sandbox is a second adapter). Pre-bake a `manim` + LaTeX image to avoid per-job cold installs.
- **Runtime: separate `api` + `worker`.** The API accepts jobs and streams progress (SSE); a dedicated worker runs the long-running agent loop off a queue.
- **Persistence: Drizzle + Postgres.** Stores the Storyboard IR and per-scene job state (pairs with `pg-boss` for the queue).
- **Narration decoupled** from `manim-voiceover` — ElevenLabs directly, word-level timestamps, ffmpeg mux at assembly.

## Layout

```
apps/       # web (React/Vite dashboard), api (Hono/Bun), worker (agent loop)
packages/   # schemas (the IR), agent, manim, narration, render, vision, # sandbox, research, media, ai, db, queue
```

> Shared config (`tsconfig.base.json`, `biome.jsonc`) lives at the repo root and is extended per package. App/package internals are added incrementally.

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
