/** Create-or-resume a conversation's Daytona sandbox, destroy it on delete.
 * The toolchain is baked into the snapshot (see ../../snapshot/Dockerfile), so
 * a sandbox boots ready with no bootstrap. Tools act on the handle directly. */

import { getServerEnv } from "@animus/core/env";
import {
  Daytona,
  DaytonaAuthenticationError,
  DaytonaAuthorizationError,
  DaytonaError,
  DaytonaNotFoundError,
  type Sandbox,
} from "@daytonaio/sdk";

/** The snapshot makes this world-writable, so any Daytona user can work in it. */
export const PROJECT_DIR = "/home/daytona/project";

/** Refresh with `bun run snapshot:build` after changing the Dockerfile. The
 * tag is required: Daytona rejects mutable ones like `latest`. */
export const SNAPSHOT_NAME = "animus-manim:0.9.1";

const CREATE_TIMEOUT_SEC = 180;
const DELETE_TIMEOUT_SEC = 60;
const AUTO_STOP_MINUTES = 30;
/** Stopping frees compute but not disk; only archiving does. The SDK default
 * of 7 days is long enough to exhaust the account's storage quota, after which
 * every new conversation fails to get a sandbox. */
const AUTO_ARCHIVE_MINUTES = 60;

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
      autoArchiveInterval: AUTO_ARCHIVE_MINUTES,
      labels: { app: "animus", conversationId: input.conversationId },
      envVars: {
        ELEVEN_API_KEY: input.elevenLabsApiKey,
        ELEVENLABS_API_KEY: input.elevenLabsApiKey,
      },
    },
    { timeout: CREATE_TIMEOUT_SEC }
  );
}

/** True when the sandbox host itself refused (quota, rate limit, unreachable),
 * as opposed to a bug on our side. Lets the API answer 503 rather than 500
 * without taking a dependency on the Daytona SDK. Rejected credentials are
 * excluded deliberately: they never clear on their own, so "try again in a few
 * minutes" would dress a total outage up as a busy afternoon. */
export function isSandboxProvisioningError(error: unknown): boolean {
  if (
    error instanceof DaytonaAuthenticationError ||
    error instanceof DaytonaAuthorizationError
  ) {
    return false;
  }
  return error instanceof DaytonaError;
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

/** Starts it if stopped. Null only when the sandbox is genuinely gone, so the
 * caller creates afresh. Every other failure propagates: replacing a sandbox
 * that still exists orphans it (nothing but conversation delete reclaims one)
 * and silently drops the conversation's project files. */
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
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) {
      return null;
    }
    throw error;
  }
}
