/** Daytona sandbox lifecycle for a conversation: create-or-resume from the
 * prebaked Manim snapshot and destroy on delete. This module owns the provider
 * SDK and nothing else — the agent's tools act on the returned Daytona sandbox
 * handle directly.
 *
 * The toolchain (Manim + ffmpeg + LaTeX) is baked into a snapshot ahead of time
 * (see ../../snapshot/Dockerfile and ../../scripts/build-snapshot.ts), so
 * sandboxes boot ready with no per-sandbox bootstrap. */

import { getServerEnv } from "@animus/core/env";
import { Daytona, type Sandbox } from "@daytonaio/sdk";

/** Where the agent's Manim project lives inside the sandbox. The snapshot makes
 * this directory world-writable so it works whatever user Daytona runs as. */
export const PROJECT_DIR = "/home/daytona/project";

/** The prebaked snapshot sandboxes boot from. Build or refresh it with
 * `bun run snapshot:build` in this package after changing the Dockerfile. The
 * tag is required — Daytona rejects mutable tags like `latest`. */
export const SNAPSHOT_NAME = "animus-manim:0.2";

const CREATE_TIMEOUT_SEC = 180;
const DELETE_TIMEOUT_SEC = 60;
const AUTO_STOP_MINUTES = 30;

/** Daytona's executeCommand returns stdout under `artifacts`, falling back to
 * `result`. Tools reuse this to read command output. */
export function commandOutput(res: {
  artifacts?: { stdout?: string };
  result?: string;
}): string {
  return res.artifacts?.stdout ?? res.result ?? "";
}

let client: Daytona | null = null;

function getClient(): Daytona {
  if (!client) {
    const env = getServerEnv();
    if (!env.daytonaApiKey) {
      throw new Error("DAYTONA_API_KEY is required to use the sandbox");
    }
    client = new Daytona({
      apiKey: env.daytonaApiKey,
      target: env.daytonaTarget,
    });
  }
  return client;
}

/** Create-or-resume the conversation's sandbox from the Manim snapshot. Pass the
 * persisted id to resume; the returned sandbox's `id` is the one to persist
 * (unchanged on resume, fresh if the old one was evicted or none existed). */
export async function ensureSandbox(input: {
  conversationId: string;
  sandboxId?: string | null;
}): Promise<Sandbox> {
  const daytona = getClient();

  if (input.sandboxId) {
    const resumed = await resume(daytona, input.sandboxId);
    if (resumed) {
      return resumed;
    }
  }

  return daytona.create(
    {
      snapshot: SNAPSHOT_NAME,
      autoStopInterval: AUTO_STOP_MINUTES,
      labels: { app: "animus", conversationId: input.conversationId },
    },
    { timeout: CREATE_TIMEOUT_SEC }
  );
}

/** Destroy a sandbox on conversation delete. No-op if it's already gone. */
export async function destroySandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await getClient().get(sandboxId);
    await sandbox.delete(DELETE_TIMEOUT_SEC);
  } catch {
    // Already gone (deleted, archived-expired, or never created) — nothing to do.
  }
}

/** Resume a known sandbox, starting it if stopped. Null if it's gone so the
 * caller can create a fresh one. */
async function resume(
  daytona: Daytona,
  sandboxId: string
): Promise<Sandbox | null> {
  try {
    const sandbox = await daytona.get(sandboxId);
    if (sandbox.state !== undefined && String(sandbox.state) !== "started") {
      await sandbox.start();
    }
    return sandbox;
  } catch {
    return null;
  }
}
