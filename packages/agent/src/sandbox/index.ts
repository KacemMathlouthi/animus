/** Create-or-resume a conversation's Daytona sandbox, destroy it on delete.
 * The toolchain is baked into the snapshot (see ../../snapshot/Dockerfile), so
 * a sandbox boots ready with no bootstrap. Tools act on the handle directly. */

import { getServerEnv } from "@animus/core/env";
import { Daytona, type Sandbox } from "@daytonaio/sdk";

/** The snapshot makes this world-writable, so any Daytona user can work in it. */
export const PROJECT_DIR = "/home/daytona/project";

/** Refresh with `bun run snapshot:build` after changing the Dockerfile. The
 * tag is required: Daytona rejects mutable ones like `latest`. */
export const SNAPSHOT_NAME = "animus-manim:0.8";

const CREATE_TIMEOUT_SEC = 180;
const DELETE_TIMEOUT_SEC = 60;
const AUTO_STOP_MINUTES = 30;

/** executeCommand puts stdout under `artifacts`, falling back to `result`. */
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

/** Pass the persisted id to resume; always persist the returned `id`, which is
 * fresh if the old sandbox was evicted. The key here is only a baseline: the
 * render command re-injects the current one, so a mid-conversation key change
 * takes effect without recreating the sandbox. */
export async function ensureSandbox(input: {
  conversationId: string;
  sandboxId?: string | null;
  elevenLabsApiKey: string;
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
      envVars: {
        ELEVEN_API_KEY: input.elevenLabsApiKey,
        ELEVENLABS_API_KEY: input.elevenLabsApiKey,
      },
    },
    { timeout: CREATE_TIMEOUT_SEC }
  );
}

/** No-op if the sandbox is already gone. */
export async function destroySandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await getClient().get(sandboxId);
    await sandbox.delete(DELETE_TIMEOUT_SEC);
  } catch {
    // Deleted, archive-expired, or never created.
  }
}

/** Starts it if stopped. Null when it is gone, so the caller creates afresh. */
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
