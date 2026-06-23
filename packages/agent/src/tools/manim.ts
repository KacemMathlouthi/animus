import {
  ListFilesInputSchema,
  type ListFilesOutput,
  ReadFileInputSchema,
  type ReadFileOutput,
  RenderSceneInputSchema,
  type RenderSceneOutput,
  RunCommandInputSchema,
  type RunCommandOutput,
  WriteFileInputSchema,
  type WriteFileOutput,
} from "@animus/core/tools";
import type { Sandbox } from "@daytonaio/sdk";
import { type ToolSet, tool } from "ai";
import { commandOutput, PROJECT_DIR } from "../sandbox/index.ts";

const MAX_LOG_CHARS = 6000;
const RENDER_TIMEOUT_SEC = 600;
const COMMAND_TIMEOUT_SEC = 300;
const QUALITY_FLAG = { low: "-ql", high: "-qh" } as const;
const QUALITY_DIR = { low: "480p15", high: "1080p60" } as const;
/** Manim prints "File ready at '<abs path>.mp4'" on success. */
const FILE_READY = /File ready at\s+'?([^'\n]+\.mp4)'?/;
const DIR_PREFIX = /^.*\//;
const PY_SUFFIX = /\.py$/;

/** Persist a rendered video and return an absolute URL the web can embed.
 * Implemented by the API (local disk in v0.1, object storage later). */
export type SaveVideo = (input: {
  bytes: Uint8Array;
  conversationId: string;
  scene: string;
}) => Promise<string>;

function resolvePath(path: string): string {
  return path.startsWith("/") ? path : `${PROJECT_DIR}/${path}`;
}

/** Keep the tail — manim's error and the "File ready" line are both at the end. */
function tailLog(output: string): string {
  return output.length > MAX_LOG_CHARS ? output.slice(-MAX_LOG_CHARS) : output;
}

function outputPath(
  logs: string,
  file: string,
  scene: string,
  quality: keyof typeof QUALITY_DIR
): string {
  const match = logs.match(FILE_READY);
  if (match?.[1]) {
    return match[1];
  }
  // Fallback to manim's deterministic layout: media/videos/<stem>/<qual>/<scene>.mp4
  const stem = file.replace(DIR_PREFIX, "").replace(PY_SUFFIX, "");
  return `${PROJECT_DIR}/media/videos/${stem}/${QUALITY_DIR[quality]}/${scene}.mp4`;
}

export function createManimTools(deps: {
  sandbox: Sandbox;
  conversationId: string;
  saveVideo: SaveVideo;
}): ToolSet {
  const { sandbox, conversationId, saveVideo } = deps;

  return {
    writeFile: tool({
      description:
        "Write (or overwrite) a file in the Manim project, e.g. a Python scene. Path is relative to the project root.",
      inputSchema: WriteFileInputSchema,
      execute: async ({ path, content }): Promise<WriteFileOutput> => {
        await sandbox.fs.uploadFiles([
          {
            source: Buffer.from(content, "utf8"),
            destination: resolvePath(path),
          },
        ]);
        return { path, bytes: Buffer.byteLength(content, "utf8") };
      },
    }),
    readFile: tool({
      description:
        "Read a file from the Manim project to inspect what you previously wrote.",
      inputSchema: ReadFileInputSchema,
      execute: async ({ path }): Promise<ReadFileOutput> => {
        const buffer = await sandbox.fs.downloadFile(resolvePath(path));
        return { path, content: buffer.toString("utf8") };
      },
    }),
    listFiles: tool({
      description: "List files in a directory of the Manim project.",
      inputSchema: ListFilesInputSchema,
      execute: async ({ path }): Promise<ListFilesOutput> => {
        const entries = await sandbox.fs.listFiles(resolvePath(path));
        return { path, entries: entries.map((entry) => entry.name) };
      },
    }),
    runCommand: tool({
      description:
        "Run a shell command in the project directory (e.g. pip install, ls, cat). Output is stdout and stderr combined.",
      inputSchema: RunCommandInputSchema,
      execute: async ({ command }): Promise<RunCommandOutput> => {
        const res = await sandbox.process.executeCommand(
          `${command} 2>&1`,
          PROJECT_DIR,
          undefined,
          COMMAND_TIMEOUT_SEC
        );
        return {
          command,
          exitCode: res.exitCode,
          output: tailLog(commandOutput(res)),
        };
      },
    }),
    renderScene: tool({
      description:
        "Render a Manim Scene to an mp4. Provide the Python file and the Scene subclass name. On failure, read the returned logs and fix the code, then render again.",
      inputSchema: RenderSceneInputSchema,
      execute: async ({ file, scene, quality }): Promise<RenderSceneOutput> => {
        const command = `manim render ${QUALITY_FLAG[quality]} --format=mp4 --media_dir ${PROJECT_DIR}/media ${file} ${scene} 2>&1`;
        const res = await sandbox.process.executeCommand(
          command,
          PROJECT_DIR,
          undefined,
          RENDER_TIMEOUT_SEC
        );
        const output = commandOutput(res);
        const logs = tailLog(output);

        if (res.exitCode !== 0) {
          return { ok: false, file, scene, exitCode: res.exitCode, logs };
        }

        const path = outputPath(output, file, scene, quality);
        try {
          const buffer = await sandbox.fs.downloadFile(path);
          const videoUrl = await saveVideo({
            bytes: new Uint8Array(buffer),
            conversationId,
            scene,
          });
          return { ok: true, file, scene, exitCode: 0, videoUrl, logs };
        } catch (error) {
          return {
            ok: false,
            file,
            scene,
            exitCode: 0,
            logs: `${logs}\n\n[animus] Render reported success but the output at ${path} could not be retrieved: ${String(error)}`,
          };
        }
      },
    }),
  } satisfies ToolSet;
}
