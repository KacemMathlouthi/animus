# Architecture

This is the decision record for animus — what we're building, the choices we've
locked in, and why. It supersedes the older "separate worker + pg-boss queue +
12 packages" sketch.

## What animus is

An **interactive coding agent for Manim videos** — Claude Code, but in the cloud
and specialized for explainer animations. The user chats with the agent; the
agent writes and edits Manim code in a persistent cloud sandbox, renders it,
reads the errors / inspects frames, and repairs until the scene is clean. The
user can interrupt and steer at any turn (chat-only steering — the agent owns the
code). Narration is generated separately and muxed in.

The mental model is a relocated Claude Code:

| Claude Code (local)            | animus (cloud)                                   |
| ------------------------------ | ------------------------------------------------ |
| Loop runs in your terminal     | Loop runs in `apps/api`                           |
| Tools act on local files       | Tools act on a remote Daytona sandbox             |
| Streams to the terminal        | Streams to the browser (SSE → `useChat` + Streamdown) |
| Ctrl-C to interrupt            | Abort the stream from the UI                       |
| General coding                 | Manim tools + prompting, render-and-watch         |

## Decisions (locked)

### 1. Interactive agent loop, not a batch pipeline

Each user turn runs an **AI SDK** tool-calling loop (`streamText` + a Manim
toolset + `stopWhen`), streaming tokens and tool calls to the browser over SSE
and fully interruptible via abort signals. The turn is ephemeral; if it crashes
or is interrupted, the user just sends another message.

**The persistent state is the sandbox, not a durable run.** This is the opposite
of a batch pipeline, where the durable run is the persistent thing.

We evaluated **Vercel Workflow SDK** (durable execution: `"use workflow"` /
`"use step"`, event-log replay, Postgres "world" for self-hosting). It's a great
fit for *fire-and-forget* jobs, but its value (deterministic replay of completed
steps) fights a non-deterministic LLM stream the user interrupts and redirects.
**Parked** for a future non-interactive "autonomous render" mode ("here's a
topic, render a full video and email me"), where it would shine.

### 2. Sandbox: Daytona, per-conversation, suspend/resume

One Daytona sandbox **per conversation**. Suspended (snapshotted) when idle,
resumed (~sub-second) on the next message. The Manim project files persist in the
sandbox across turns — the agent edits `scene.py`, renders, the user says "make
it slower", it edits the same file again.

- Chosen over Vercel Sandbox (weak custom-image story; Manim+LaTeX is a heavy
  image that must be **prebaked**, not installed per turn) and over E2B (close
  call; Daytona wins on indefinite runtime + snapshots + a solid TS SDK).
- Wrapped behind a thin one-method adapter (`run(...) → { logs, frames, artifacts }`)
  so E2B / Vercel Sandbox can slot in later. Don't over-abstract early.
- **Prebake a `manim` + LaTeX Daytona snapshot** as the base image.

### 3. Models: Claude default, free tier → pay/BYOK

- **Anthropic (Claude)** is the default coding brain (strongest at code
  generation/repair), via the **AI SDK** (provider-agnostic, so BYOK users can
  pick others — OpenAI, Google, Mistral, Groq, xAI per the settings page).
- **Free tier on our keys** with a per-user quota (e.g. a small number of
  videos/conversations — exact numbers TBD). Beyond the quota: pay, or **bring
  your own key (BYOK)**.
- **BYO keys stored AES-256-GCM-encrypted in Postgres** with a server-held
  secret, never returned to the client in plaintext. (Cloud KMS envelope
  encryption considered but rejected for now — ties us to one cloud, conflicts
  with the multi-cloud posture.)

### 4. Runtime: `apps/api` hosts the loop, persistent container

`apps/api` (Hono/Bun) runs the streaming agent loop directly. It must be a
**long-running container** — streaming responses and live sandbox handles need a
persistent process, so **not** serverless/Lambda. No separate worker or queue in
v1 (that was the old plan; the interactive loop doesn't need it).

### 5. Persistence: Drizzle + managed Postgres

Drizzle ORM over a managed Postgres (Railway / Supabase / Render). Stores:
conversations, messages, per-user settings, sandbox handles, usage/quota.
**Generation settings (voice, music, theme, font) are global per-user** (matches
the Linear-style settings page).

### 6. Storage: Cloudflare R2

Rendered videos go to **Cloudflare R2** (S3-compatible API). Multi-cloud posture
overall: managed Postgres + a container host (likely EC2) + R2 — no single-cloud
lock-in.

### 7. Narration decoupled

ElevenLabs directly (not `manim-voiceover`): word-level timestamps, ffmpeg mux at
assembly.

## Layout

```
apps/
  web/    # React 19 + Vite SPA — landing, auth, studio, settings, legal
  api/    # Hono/Bun — auth surface + streaming agent loop (long-running)
packages/
  auth/   # Better Auth (exists)
  db/     # Drizzle + Postgres (exists)
  agent/  # the loop + Manim tools + sandbox adapter (lands with generation work)
```

`agent` may start with the sandbox adapter, narration, and ffmpeg-mux as internal
modules; promote them to their own packages only if they grow.

## Build roadmap

1. **Finish the shell** (current focus, closes `feat/pages-and-tests`):
   - Settings backend: encrypted BYO key storage (AES-256-GCM) + generation prefs
     persistence (global per-user) + authenticated API routes.
   - Automated tests (Vitest + Testing Library + jsdom; unit + render smoke; no
     Playwright).
2. **Real streaming chat:** conversation/message persistence + `/api/chat` AI SDK
   loop streaming to `useChat` + Streamdown, with Manim/sandbox tools stubbed.
   Kills the mocked `use-studio-chat`.
3. **First Manim scene end-to-end:** wire the Daytona sandbox (prebaked image),
   one scene rendered from chat.
4. **Generalize the loop:** diagnose/repair, narration, ffmpeg mux, R2 upload,
   playback in the studio.
5. **Later:** quota/billing (free-tier metering → payments), autonomous render
   mode (where Workflow SDK returns).

## Open items

- Exact free-tier quota unit and numbers (per-video vs per-conversation; how
  many).
- Payment provider for the paid tier.
- Daytona cost tuning (suspend aggressiveness, snapshot retention).
