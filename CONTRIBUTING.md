# Contributing to animus

Thanks for taking the time. This file covers what you need to get running and
what a change has to satisfy before it lands.

[CLAUDE.md](CLAUDE.md) is the decision record. If you want to know why something
is built the way it is, and which approaches were tried and rejected, read it
first. It saves re-litigating settled calls.

## Setup

```bash
cp .env.example .env   # fill in what you have; the file has notes
docker compose up -d   # Postgres on :5432
bun install
cd packages/db && bun run db:migrate && cd ../..
bun run dev            # web on :5173, api on :8787
```

Use Bun for everything. Not npm, not npx, not node. The packages are source
first, so there is no per package build step: `apps/api` and every package run
TypeScript directly, and `apps/web` is the only thing Vite builds.

You do not need every credential to work on most of the codebase:

- `DAYTONA_API_KEY` and `EXA_API_KEY` are genuinely optional. They only resolve
  when a turn needs the sandbox or web research.
- Without `RESEND_API_KEY`, magic links print to the API console. That is enough
  to sign in locally.
- `ELEVENLABS_API_KEY` and the four `R2_*` vars must be present with any non
  empty value, because the API validates its env at boot. This is a known rough
  edge, not a requirement that you hold real keys.

Rendering an actual video end to end needs Daytona and a paid ElevenLabs tier.
Most changes do not.

## The four checks

Every change has to pass all four before it is ready:

```bash
bun run typecheck   # tsc across every workspace, the cross package compile check
bunx ultracite check   # lint and format, no writes
bun run knip        # unused files, deps and exports
bun run test        # the test suite
```

CI runs the same four plus the web build, as separate jobs, so a red run tells
you exactly which one broke. Run them locally first.

`bunx ultracite fix` applies formatting and safe fixes. Note that Biome also
lints embedded CSS and HTML, so a `.html` file in `scripts/` is checked too.

## Tests are part of the change

This is the rule most likely to send a pull request back:

- Every bug fix ships a test that reproduces the bug and verifies the fix.
- Every new feature ships tests for its public API, its error paths and its edge
  cases.
- Every refactor that changes behavior updates the affected tests.

Tests live in `__tests__/` folders next to their source. Shared helpers live in
`src/__tests__/helpers/`. Use Vitest and do not use `bun test`.

Run the suite with `bun run test`, which enters each workspace and uses that
workspace's own config. Running `bunx vitest run` from the repo root does not
work: there is deliberately no root `vitest.config.ts`, so the `apps/web` files
run without jsdom and the `@` alias and fail. Inside a single workspace,
`bunx vitest run` is fine.

`apps/web` runs under React Testing Library and jsdom through its own
`apps/web/vitest.config.ts`. For deterministic agent tests, use the mock
providers from `ai/test` together with `simulateReadableStream` from `ai`.

Declarative or trivial modules (schema DDL, barrels, config constants, Better
Auth wiring) and presentational only components are deliberately not unit
tested. Everything that carries logic is.

## Code conventions

- No `any`. Use `unknown` and narrow.
- Public functions get explicit return types.
- All external input is validated with Zod. Keep services stateless per request.
- No TypeScript `enum` (`erasableSyntaxOnly` is on). Use `as const` arrays and
  union types.
- `verbatimModuleSyntax` is on, so type only imports need `import type` or an
  inline `type`.
- Shared contracts live in `@animus/core`. Its root entry is pure, meaning no
  `process.env`, no `node:*` and no side effects, so the web can import it.
  Server env sits behind `@animus/core/env` and the web must never import it.
  A Biome rule enforces that.
- Never read `process.env` directly in runtime code. Import from
  `@animus/core/env`. Build time tooling configs are the exception.
- Use structured logs: `logger.info({ ...ctx }, "message")`.
- No dead code, no commented out blocks, no unreferenced wiring. If you add a
  feature, wire it fully in the same change.
- Do not blindly retry aborts or timeouts. If you add a retry to an external
  call, add the dependency in the same change rather than assuming one exists.

## Completeness

When a complete implementation and a shortcut are both on the table, prefer the
complete one. Full parity, the edge cases, the error paths, the tests. The
difference between 80 and 150 lines is not worth the follow up issue.

The exception is genuinely large work: rewriting a system, changing something in
a dependency we do not control, a multi quarter migration. Flag those as out of
scope rather than half doing them.

If you notice something wrong while working on something else, say so in the
pull request even if you do not fix it. A noticed problem that goes unmentioned
is the expensive kind.

## Commits and pull requests

Commits follow [Conventional Commits](https://www.conventionalcommits.org):
`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, with an optional scope such as
`feat(web):`. Keep the subject short and in the imperative.

Do not add AI attribution or `Co-Authored-By` lines for assistants.

For a pull request:

1. Branch off `main`.
2. Keep it focused. One concern per pull request is easier to review and easier
   to revert.
3. Say what changed and why. If it changes behavior a user can see, say what
   they will notice.
4. Confirm the four checks pass.
5. If the change alters architecture, a locked decision or a workflow, update
   `CLAUDE.md` in the same pull request. It is meant to reflect current reality
   at all times.

## Database changes

Schema lives in `packages/db/src/schema`. Generate a migration with
`bun run db:generate`, apply it with `bun run db:migrate`, and commit the
generated SQL and its snapshot together. Do not hand edit an applied migration.
For destructive changes, expand then contract.

## Reporting bugs and asking for features

Open an issue. For a bug, the useful ones include what you did, what happened,
what you expected, and anything from the console or the API logs. If it involves
a render, the scene code and the tail of the Manim output are usually the whole
story.

For security issues, do not open an issue. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the MIT
license, the same as the rest of the project.
