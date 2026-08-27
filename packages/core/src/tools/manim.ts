import { z } from "zod";

/** Manim sandbox tools — the agent writes Python scene files into a per-
 * conversation Daytona sandbox, inspects them, runs shell commands, and renders
 * scenes to video. Inputs are pure schemas shared with the web (which renders
 * each tool call); execution lives in `@animus/agent`. */

export const RENDER_QUALITIES = ["low", "high"] as const;
export type RenderQuality = (typeof RENDER_QUALITIES)[number];

export const WriteFileInputSchema = z
  .object({
    /** Path relative to the project root, e.g. "scene.py". */
    path: z.string().min(1),
    content: z.string(),
  })
  .strict();
export type WriteFileInput = z.infer<typeof WriteFileInputSchema>;

export interface WriteFileOutput {
  bytes: number;
  path: string;
}

export const EditFileInputSchema = z
  .object({
    /** Path relative to the project root, e.g. "scene.py". */
    path: z.string().min(1),
    /** Exact text to find — copied verbatim from the file, matched literally. */
    oldString: z.string().min(1),
    newString: z.string(),
    /** Replace every occurrence. When false (default) oldString must be unique. */
    replaceAll: z.boolean().default(false),
  })
  .strict();
export type EditFileInput = z.infer<typeof EditFileInputSchema>;

export interface EditFileOutput {
  path: string;
  replacements: number;
}

export const ReadFileInputSchema = z
  .object({ path: z.string().min(1) })
  .strict();
export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export interface ReadFileOutput {
  content: string;
  path: string;
}

export const ListFilesInputSchema = z
  .object({ path: z.string().min(1).default(".") })
  .strict();
export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;

export interface ListFilesOutput {
  entries: string[];
  path: string;
}

export const RunCommandInputSchema = z
  .object({ command: z.string().min(1) })
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
    /** Python file containing the scene, relative to the project root. */
    file: z.string().min(1),
    scene: z.string().min(1),
    /** Render quality — "high" (1080p60) is the default for final delivery;
     * "low" (480p15) is for fast iteration via test renders. */
    quality: z.enum(RENDER_QUALITIES).default("high"),
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
