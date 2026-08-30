/** Builds the prebaked Manim snapshot sandboxes boot from: `bun run
 * snapshot:build`, again whenever ../snapshot/Dockerfile changes. Build-time
 * tooling, so it reads process.env directly rather than the server-env schema,
 * which would demand the full app config just to build an image. */

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
// The skill sits outside the Dockerfile's build context, so it is baked in
// here rather than COPYed. The agent reads it on demand.
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
