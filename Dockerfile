# Container image for apps/api. Runs the Bun server entry directly, so the
# source-first workspace (.ts specifiers, @animus/* symlinks, native modules)
# resolves exactly as in local dev.
#
# Deployed to ECS Fargate behind an ALB. The task runs continuously: no request
# duration cap beyond the ALB's idle timeout (set it to 4000s), and no
# scale-to-zero, so in-memory state such as `inFlightTurns` is sound as long as
# the service runs a single task.

FROM oven/bun:1.3-slim

WORKDIR /app

# Manifests first so the dependency layer caches across source-only changes.
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/agent/package.json packages/agent/
COPY packages/auth/package.json packages/auth/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
# --production drops every workspace's devDependencies (vitest, drizzle-kit, the
# web toolchain); none are imported at runtime. Verify with the / and /health
# boot probe after any image change.
RUN bun install --frozen-lockfile --production

COPY . .

ENV NODE_ENV=production
# The API reads PORT and the ALB target group points at the same number.
ENV PORT=8787
EXPOSE 8787

# SIGTERM reaches the process directly (exec form, no shell wrapper), which is
# what lets lib/shutdown.ts drain in-flight turns before ECS kills the task.
CMD ["bun", "apps/api/src/server.ts"]
