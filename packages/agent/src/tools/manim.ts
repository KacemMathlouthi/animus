import {
  EditFileInputSchema,
  type EditFileOutput,
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

const MAX_LOG_CHARS = 16_000;
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

/** Count non-overlapping literal occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) {
      return count;
    }
    count++;
    from = at + needle.length;
  }
}

/** Keep the tail — manim's error and the "File ready" line are both at the end.
 * Prefix a marker when truncated so the model knows earlier output was dropped
 * rather than treating the log as complete. */
function tailLog(output: string): string {
  if (output.length <= MAX_LOG_CHARS) {
    return output;
  }
  const dropped = output.length - MAX_LOG_CHARS;
  return `[... truncated ${dropped} earlier characters ...]\n${output.slice(-MAX_LOG_CHARS)}`;
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
    editFile: tool({
      description:
        "Make a surgical edit to an existing file by replacing an exact snippet — prefer this over rewriting the whole file for small fixes. `oldString` is matched literally (copy it verbatim from the file, including indentation) and must be unique unless `replaceAll` is true. Returns an error if it is not found or is ambiguous.",
      inputSchema: EditFileInputSchema,
      execute: async ({
        path,
        oldString,
        newString,
        replaceAll,
      }): Promise<EditFileOutput> => {
        if (oldString === newString) {
          throw new Error(
            "oldString and newString are identical — nothing to change."
          );
        }
        const resolved = resolvePath(path);
        const buffer = await sandbox.fs.downloadFile(resolved);
        const count = countOccurrences(buffer.toString("utf8"), oldString);
        if (count === 0) {
          throw new Error(
            `oldString was not found in ${path}. Read the file and copy the exact text (including indentation) you want to replace.`
          );
        }
        if (count > 1 && !replaceAll) {
          throw new Error(
            `oldString matches ${count} times in ${path}. Add surrounding context to make it unique, or pass replaceAll: true to change every occurrence.`
          );
        }
        // Daytona applies the replacement in-sandbox (no download/upload of the
        // edited content); the read above is only to validate the match.
        await sandbox.fs.replaceInFiles([resolved], oldString, newString);
        return { path, replacements: count };
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
        // Invoke via `python3 -m manim` so it works regardless of whether the
        // manim console script is on PATH (pip --user installs land in
        // ~/.local/bin, which non-login shells often don't include).
        const command = `python3 -m manim render ${QUALITY_FLAG[quality]} --format=mp4 --media_dir ${PROJECT_DIR}/media ${file} ${scene} 2>&1`;
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
