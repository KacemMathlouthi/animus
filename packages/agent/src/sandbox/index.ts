/** Daytona sandbox lifecycle for a conversation: create-or-resume, bootstrap the
 * Manim toolchain once, and destroy on delete. This module owns the provider SDK
 * and nothing else — the agent's tools act on the returned Daytona sandbox
 * handle directly. */

import { getServerEnv } from "@animus/core/env";
import { Daytona, type Sandbox } from "@daytonaio/sdk";

/** Where the agent's Manim project lives inside the sandbox. The stock Daytona
 * python image runs as user `daytona` with home `/home/daytona`. */
export const PROJECT_DIR = "/home/daytona/project";

/** Marker written once the toolchain (manim + ffmpeg) is installed, so resuming
 * a sandbox skips the multi-minute bootstrap. */
const READY_MARKER = "/home/daytona/.animus-ready";

const CREATE_TIMEOUT_SEC = 180;
const DELETE_TIMEOUT_SEC = 60;
const BOOTSTRAP_TIMEOUT_SEC = 900;
const AUTO_STOP_MINUTES = 30;

/** v0.1 bootstrap on the stock Daytona python image: install ffmpeg + Manim's
 * native deps + Manim itself, create the project dir, and stamp the ready
 * marker. Best-effort sudo (the image may or may not run as root). Idempotent. */
const BOOTSTRAP_SCRIPT = `set -e
if [ "$(id -u)" != "0" ]; then SUDO="sudo"; else SUDO=""; fi
$SUDO apt-get update -y
$SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg libcairo2-dev libpango1.0-dev pkg-config python3-dev build-essential
python3 -m pip install --break-system-packages manim || python3 -m pip install manim
mkdir -p ${PROJECT_DIR}
touch ${READY_MARKER}`;

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

/** Create-or-resume the conversation's sandbox, with the toolchain ready. Pass
 * the persisted id to resume; the returned sandbox's `id` is the one to persist
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

  const sandbox = await daytona.create(
    {
      language: "python",
      autoStopInterval: AUTO_STOP_MINUTES,
      labels: { app: "animus", conversationId: input.conversationId },
    },
    { timeout: CREATE_TIMEOUT_SEC }
  );
  await bootstrap(sandbox);
  return sandbox;
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
    await bootstrap(sandbox);
    return sandbox;
  } catch {
    return null;
  }
}

/** Install the toolchain once; idempotent via the ready marker. */
async function bootstrap(sandbox: Sandbox): Promise<void> {
  const check = await sandbox.process.executeCommand(
    `test -f ${READY_MARKER} && echo ready || echo missing`
  );
  if (commandOutput(check).includes("ready")) {
    return;
  }

  const result = await sandbox.process.executeCommand(
    BOOTSTRAP_SCRIPT,
    undefined,
    undefined,
    BOOTSTRAP_TIMEOUT_SEC
  );
  if (result.exitCode !== 0) {
    throw new Error(`Sandbox bootstrap failed:\n${commandOutput(result)}`);
  }
}
