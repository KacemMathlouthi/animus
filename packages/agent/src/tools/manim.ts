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
import { extractNarrationChars } from "../metering/narration.ts";
import { commandOutput, PROJECT_DIR } from "../sandbox/index.ts";
import { createRedactor } from "../utils/redact.ts";

const MAX_LOG_CHARS = 16_000;
const RENDER_TIMEOUT_SEC = 600;
const COMMAND_TIMEOUT_SEC = 300;
const QUALITY_FLAG = { low: "-ql", high: "-qh" } as const;
const QUALITY_DIR = { low: "480p15", high: "1080p60" } as const;
/** Manim prints "File ready at '<abs path>.mp4'" on success. */
const FILE_READY = /File ready at\s+'?([^'\n]+\.mp4)'?/;
const DIR_PREFIX = /^.*\//;
const PY_SUFFIX = /\.py$/;
const MP4_SUFFIX = /\.mp4$/;
/** Where the fetched background track is staged in the sandbox before muxing. */
const MUSIC_TRACK = `${PROJECT_DIR}/.background-music.mp3`;
const MUSIC_VOLUME = 0.08;
const MUSIC_FADE_IN_SEC = 2;

/** Returns an R2 object key the web resolves to a presigned URL. */
export type SaveVideo = (input: {
  bytes: Uint8Array;
  conversationId: string;
  scene: string;
}) => Promise<string>;

/** Presigns the R2 track so the sandbox downloads it without a round-trip
 * through the API, and the catalog can change without a sandbox rebuild. */
export type BackgroundMusicUrl = (trackId: string) => Promise<string>;

/** Per-turn accumulator the API owns, for metering TTS after the turn. */
export interface TurnMeter {
  ttsChars: number;
}

function resolvePath(path: string): string {
  return path.startsWith("/") ? path : `${PROJECT_DIR}/${path}`;
}

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

/** Keep the tail: manim's error and its "File ready" line are both at the end.
 * The marker stops the model reading a truncated log as complete. */
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
  // Fall back to manim's deterministic media/videos/<stem>/<qual>/ layout.
  const stem = file.replace(DIR_PREFIX, "").replace(PY_SUFFIX, "");
  return `${PROJECT_DIR}/media/videos/${stem}/${QUALITY_DIR[quality]}/${scene}.mp4`;
}

/** Mixes the track under the narration. Falls back to the untouched master,
 * which already carries the narration: music never blocks delivery. */
async function muxBackgroundMusic(
  sandbox: Sandbox,
  masterPath: string,
  getMusicUrl: () => Promise<string>
): Promise<{ deliverPath: string; note?: string }> {
  const url = await getMusicUrl();
  const finalPath = masterPath.replace(MP4_SUFFIX, ".music.mp4");
  // The URL rides in the env, not the command string, so its signature query
  // params cannot break quoting. normalize=0 keeps the voice full in the amix.
  const command =
    `python3 -c "import os,urllib.request; urllib.request.urlretrieve(os.environ['MUSIC_URL'], '${MUSIC_TRACK}')" && ` +
    `ffmpeg -y -i ${masterPath} -stream_loop -1 -i ${MUSIC_TRACK} ` +
    `-filter_complex "[1:a]volume=${MUSIC_VOLUME},afade=t=in:st=0:d=${MUSIC_FADE_IN_SEC}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]" ` +
    `-map 0:v:0 -map "[a]" -shortest -c:v copy -c:a aac ${finalPath} 2>&1`;
  const res = await sandbox.process.executeCommand(
    command,
    PROJECT_DIR,
    { MUSIC_URL: url },
    COMMAND_TIMEOUT_SEC
  );
  if (res.exitCode === 0) {
    return { deliverPath: finalPath };
  }
  return {
    deliverPath: masterPath,
    note: `[animus] background music skipped (download or mix failed, exit ${res.exitCode}); delivering narration only.`,
  };
}

export function createManimTools(deps: {
  sandbox: Sandbox;
  conversationId: string;
  saveVideo: SaveVideo;
  backgroundMusicUrl: BackgroundMusicUrl;
  backgroundMusic: boolean;
  musicTrackId: string;
  /** This turn's effective key: the user's own if they brought one, else ours. */
  elevenLabsApiKey: string;
  meter: TurnMeter;
}): ToolSet {
  const {
    sandbox,
    conversationId,
    saveVideo,
    backgroundMusicUrl,
    backgroundMusic,
    musicTrackId,
    elevenLabsApiKey,
    meter,
  } = deps;

  // See utils/redact.ts for what this does and does not protect against.
  const redact = createRedactor([elevenLabsApiKey]);

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
        // Daytona replaces in-sandbox; the read above only validates the match.
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
        return { path, content: redact(buffer.toString("utf8")) };
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
          output: redact(tailLog(commandOutput(res))),
        };
      },
    }),
    renderScene: tool({
      description:
        "Render a Manim Scene to an mp4. Provide the Python file and the Scene subclass name. On failure, read the returned logs and fix the code, then render again.",
      inputSchema: RenderSceneInputSchema,
      execute: async ({ file, scene, quality }): Promise<RenderSceneOutput> => {
        // Via `python3 -m` because pip --user puts the console script in
        // ~/.local/bin, which non-login shells often leave off PATH.
        const command = `python3 -m manim render ${QUALITY_FLAG[quality]} --format=mp4 --media_dir ${PROJECT_DIR}/media ${file} ${scene} 2>&1`;
        // On the command itself, so it wins even if the sandbox was created on
        // another key. Both names: the SDK and manim-voiceover each use one.
        const res = await sandbox.process.executeCommand(
          command,
          PROJECT_DIR,
          {
            ELEVEN_API_KEY: elevenLabsApiKey,
            ELEVENLABS_API_KEY: elevenLabsApiKey,
          },
          RENDER_TIMEOUT_SEC
        );
        const output = commandOutput(res);
        const logs = redact(tailLog(output));

        if (res.exitCode !== 0) {
          return { ok: false, file, scene, exitCode: res.exitCode, logs };
        }

        // Best-effort: failing to read the source must never fail the render.
        try {
          const sceneSource = await sandbox.fs.downloadFile(resolvePath(file));
          meter.ttsChars += extractNarrationChars(sceneSource.toString("utf8"));
        } catch {
          // Under-charging is safer than failing the render.
        }

        const masterPath = outputPath(output, file, scene, quality);
        const { deliverPath, note } = backgroundMusic
          ? await muxBackgroundMusic(sandbox, masterPath, () =>
              backgroundMusicUrl(musicTrackId)
            )
          : { deliverPath: masterPath, note: undefined };
        const deliveredLogs = note ? `${logs}\n\n${note}` : logs;
        try {
          const buffer = await sandbox.fs.downloadFile(deliverPath);
          const videoKey = await saveVideo({
            bytes: new Uint8Array(buffer),
            conversationId,
            scene,
          });
          return {
            ok: true,
            file,
            scene,
            exitCode: 0,
            videoKey,
            logs: deliveredLogs,
          };
        } catch (error) {
          return {
            ok: false,
            file,
            scene,
            exitCode: 0,
            logs: `${logs}\n\n[animus] Render reported success but the output at ${deliverPath} could not be retrieved: ${String(error)}`,
          };
        }
      },
    }),
  } satisfies ToolSet;
}
