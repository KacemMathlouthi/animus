import { z } from "zod";

/** Manim sandbox tools — the agent writes Python scene files into a per-
 * conversation Daytona sandbox, inspects them, runs shell commands, and renders
 * scenes to video. Inputs are pure schemas shared with the web (which renders
 * each tool call); execution lives in `@animus/agent`. Field docs are
 * `.describe()`d, not JSDoc: only the former survives into the JSON schema the
 * model reads. */

export const RENDER_QUALITIES = ["low", "high"] as const;
export type RenderQuality = (typeof RENDER_QUALITIES)[number];

const PATH_DESCRIPTION =
  'File path relative to the project root, e.g. "scene.py". Absolute paths are allowed for the bundled skill under /home/daytona/skill.';

export const WriteFileInputSchema = z
  .object({
    path: z.string().min(1).describe(PATH_DESCRIPTION),
    content: z
      .string()
      .describe(
        "The complete file contents. Overwrites the file if it already exists."
      ),
  })
  .strict();
export type WriteFileInput = z.infer<typeof WriteFileInputSchema>;

export interface WriteFileOutput {
  bytes: number;
  path: string;
}

export const EditFileInputSchema = z
  .object({
    path: z.string().min(1).describe(PATH_DESCRIPTION),
    oldString: z
      .string()
      .min(1)
      .describe(
        "Exact text to find, copied verbatim from the file including indentation and line breaks. Matched literally, not as a pattern."
      ),
    newString: z
      .string()
      .describe("The replacement text. May be empty to delete oldString."),
    replaceAll: z
      .boolean()
      .default(false)
      .describe(
        "Replace every occurrence. When false, oldString must match exactly once or the edit is rejected."
      ),
  })
  .strict();
export type EditFileInput = z.infer<typeof EditFileInputSchema>;

export interface EditFileOutput {
  path: string;
  replacements: number;
}

export const ReadFileInputSchema = z
  .object({ path: z.string().min(1).describe(PATH_DESCRIPTION) })
  .strict();
export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export interface ReadFileOutput {
  content: string;
  path: string;
}

export const ListFilesInputSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .default(".")
      .describe(
        'Directory to list, relative to the project root. Defaults to the project root ".".'
      ),
  })
  .strict();
export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;

export interface ListFilesOutput {
  entries: string[];
  path: string;
}

export const RunCommandInputSchema = z
  .object({
    command: z
      .string()
      .min(1)
      .describe(
        "Shell command to run in the project root. stdout and stderr are returned combined, truncated to the tail."
      ),
  })
  .strict();
export type RunCommandInput = z.infer<typeof RunCommandInputSchema>;

export interface RunCommandOutput {
  command: string;
  exitCode: number;
  /** Combined stdout + stderr, truncated. */
  output: string;
}

export const RenderSceneInputSchema = z
  .object({
    file: z
      .string()
      .min(1)
      .describe(
        'Python file containing the scene, relative to the project root, e.g. "scene.py".'
      ),
    scene: z
      .string()
      .min(1)
      .describe("Exact name of the Scene subclass to render."),
    quality: z
      .enum(RENDER_QUALITIES)
      .default("high")
      .describe(
        '"high" (1080p60) for the final delivery the user receives; "low" (480p15) only for a fast test render.'
      ),
  })
  .strict();
export type RenderSceneInput = z.infer<typeof RenderSceneInputSchema>;

export interface RenderSceneOutput {
  exitCode: number;
  file: string;
  /** Combined render logs (stdout + stderr), truncated — the repair signal. */
  logs: string;
  ok: boolean;
  scene: string;
  /** R2 object key of the rendered mp4 when ok; absent on failure. The web
   * resolves it to a short-lived presigned URL via the media route. */
  videoKey?: string;
}
