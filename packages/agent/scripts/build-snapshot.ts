/** Builds (or refreshes) the prebaked Manim snapshot that sandboxes boot from.
 *
 * Run it once, and again whenever ../snapshot/Dockerfile changes:
 *   bun run snapshot:build   (from packages/agent)
 *
 * Daytona builds the image remotely from the Dockerfile and registers it under
 * SNAPSHOT_NAME; ensureSandbox then creates sandboxes from that snapshot. This
 * is build-time tooling, so — like drizzle.config.ts — it reads credentials
 * straight from process.env (injected by --env-file) rather than the server-env
 * schema, which would demand the full app config just to build an image. */

import { fileURLToPath } from "node:url";
import { Daytona, Image } from "@daytonaio/sdk";
import { SNAPSHOT_NAME } from "../src/sandbox/index.ts";

const apiKey = process.env.DAYTONA_API_KEY;
if (!apiKey) {
  throw new Error(
    "DAYTONA_API_KEY is required to build the snapshot (run via --env-file)."
  );
}

const daytona = new Daytona({ apiKey, target: process.env.DAYTONA_TARGET });

const dockerfilePath = fileURLToPath(
  new URL("../snapshot/Dockerfile", import.meta.url)
);
// The craft skill lives outside the Dockerfile's build context, so bake it in
// here rather than via a COPY. The agent reads /home/daytona/skill/references
// on demand; the always-on core is in the system prompt.
const skillDir = fileURLToPath(
  new URL("../skills/manim-video", import.meta.url)
);
const image = Image.fromDockerfile(dockerfilePath).addLocalDir(
  skillDir,
  "/home/daytona/skill"
);

process.stdout.write(`Building snapshot ${SNAPSHOT_NAME} …\n`);
await daytona.snapshot.create(
  {
    name: SNAPSHOT_NAME,
    image,
    // Manim renders are CPU/memory heavy and TeX Live needs real disk.
    resources: { cpu: 2, memory: 4, disk: 10 },
  },
  { onLogs: (chunk) => process.stdout.write(chunk), timeout: 0 }
);
process.stdout.write(`\nSnapshot ${SNAPSHOT_NAME} is ready.\n`);
