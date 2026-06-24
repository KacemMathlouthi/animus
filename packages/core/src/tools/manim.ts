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
    /** The Scene subclass name to render. */
    scene: z.string().min(1),
    /** Render quality — "low" is fast (480p15) for iteration. */
    quality: z.enum(RENDER_QUALITIES).default("low"),
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
  /** Absolute URL to the rendered mp4 when ok; absent on failure. */
  videoUrl?: string;
}
