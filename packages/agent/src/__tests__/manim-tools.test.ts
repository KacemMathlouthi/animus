import type { Sandbox } from "@daytonaio/sdk";
import { describe, expect, it, vi } from "vitest";
import { createManimTools } from "../tools/manim.ts";

const EXEC_CTX = { messages: [], toolCallId: "call-1" };

/** A fake Daytona sandbox holding a single in-memory file, exposing only the
 * fs methods editFile touches. replaceInFiles mimics Daytona's server-side
 * replace-all behaviour so the tool's own validation is what's under test. */
function createFakeSandbox(
  initial: Record<string, string>,
  commandOut = ""
): {
  sandbox: Sandbox;
  files: Record<string, string>;
  replaceCalls: Array<{ files: string[]; pattern: string; newValue: string }>;
} {
  const files = { ...initial };
  const replaceCalls: Array<{
    files: string[];
    pattern: string;
    newValue: string;
  }> = [];

  const sandbox = {
    process: {
      executeCommand: vi.fn(() =>
        Promise.resolve({ exitCode: 0, result: commandOut })
      ),
    },
    fs: {
      downloadFile: vi.fn((remotePath: string) => {
        const content = files[remotePath];
        if (content === undefined) {
          return Promise.reject(new Error(`no such file: ${remotePath}`));
        }
        return Promise.resolve(Buffer.from(content, "utf8"));
      }),
      replaceInFiles: vi.fn(
        (paths: string[], pattern: string, newValue: string) => {
          replaceCalls.push({ files: paths, pattern, newValue });
          for (const p of paths) {
            files[p] = (files[p] ?? "").split(pattern).join(newValue);
          }
          return Promise.resolve(
            paths.map((file) => ({ file, success: true }))
          );
        }
      ),
    },
  } as unknown as Sandbox;

  return { sandbox, files, replaceCalls };
}

function editTool(initial: Record<string, string>) {
  const state = createFakeSandbox(initial);
  const tools = createManimTools({
    sandbox: state.sandbox,
    conversationId: "conv-1",
    saveVideo: vi.fn(() => Promise.resolve("https://example.com/v.mp4")),
    backgroundMusicUrl: vi.fn(() => Promise.resolve("https://music.test")),
    elevenLabsApiKey: "el-test-key",
    meter: { ttsChars: 0 },
  });
  const edit = tools.editFile;
  if (!edit?.execute) {
    throw new Error("editFile tool is not executable");
  }
  return { execute: edit.execute, state };
}

function runTool(commandOut: string) {
  const state = createFakeSandbox({}, commandOut);
  const tools = createManimTools({
    sandbox: state.sandbox,
    conversationId: "conv-1",
    saveVideo: vi.fn(() => Promise.resolve("https://example.com/v.mp4")),
    backgroundMusicUrl: vi.fn(() => Promise.resolve("https://music.test")),
    elevenLabsApiKey: "el-test-key",
    meter: { ttsChars: 0 },
  });
  const run = tools.runCommand;
  if (!run?.execute) {
    throw new Error("runCommand tool is not executable");
  }
  return run.execute;
}

const ABS = "/home/daytona/project/scene.py";
const NOT_FOUND = /was not found/;
const AMBIGUOUS = /matches 2 times/;
const IDENTICAL = /identical/;
const TRUNCATED = /^\[\.\.\. truncated \d+ earlier characters \.\.\.\]\n/;
const MAX_LOG_CHARS = 16_000;

describe("editFile tool", () => {
  it("replaces a unique snippet in place via replaceInFiles", async () => {
    const { execute, state } = editTool({
      [ABS]: "a = 1\nfont_size=24\nb = 2\n",
    });

    const output = await execute(
      {
        path: "scene.py",
        oldString: "font_size=24",
        newString: "font_size=30",
        replaceAll: false,
      },
      EXEC_CTX
    );

    expect(output).toEqual({ path: "scene.py", replacements: 1 });
    expect(state.replaceCalls).toEqual([
      { files: [ABS], pattern: "font_size=24", newValue: "font_size=30" },
    ]);
    expect(state.files[ABS]).toBe("a = 1\nfont_size=30\nb = 2\n");
  });

  it("errors when oldString is not found and does not call replaceInFiles", async () => {
    const { execute, state } = editTool({ [ABS]: "a = 1\n" });

    await expect(
      execute(
        {
          path: "scene.py",
          oldString: "nope",
          newString: "x",
          replaceAll: false,
        },
        EXEC_CTX
      )
    ).rejects.toThrow(NOT_FOUND);
    expect(state.replaceCalls).toEqual([]);
  });

  it("errors on an ambiguous match unless replaceAll is set", async () => {
    const { execute, state } = editTool({ [ABS]: "x = 1\nx = 1\n" });

    await expect(
      execute(
        {
          path: "scene.py",
          oldString: "x = 1",
          newString: "x = 2",
          replaceAll: false,
        },
        EXEC_CTX
      )
    ).rejects.toThrow(AMBIGUOUS);
    expect(state.replaceCalls).toEqual([]);
  });

  it("replaces every occurrence when replaceAll is true", async () => {
    const { execute, state } = editTool({ [ABS]: "x = 1\nx = 1\n" });

    const output = await execute(
      {
        path: "scene.py",
        oldString: "x = 1",
        newString: "x = 2",
        replaceAll: true,
      },
      EXEC_CTX
    );

    expect(output).toEqual({ path: "scene.py", replacements: 2 });
    expect(state.files[ABS]).toBe("x = 2\nx = 2\n");
  });

  it("rejects a no-op edit where oldString equals newString", async () => {
    const { execute, state } = editTool({ [ABS]: "x = 1\n" });

    await expect(
      execute(
        {
          path: "scene.py",
          oldString: "x = 1",
          newString: "x = 1",
          replaceAll: false,
        },
        EXEC_CTX
      )
    ).rejects.toThrow(IDENTICAL);
    expect(state.replaceCalls).toEqual([]);
  });
});

describe("runCommand log truncation", () => {
  it("returns short output unchanged", async () => {
    const execute = runTool("all good\n");

    const output = await execute({ command: "echo hi" }, EXEC_CTX);

    expect(output.output).toBe("all good\n");
  });

  it("keeps the tail and prefixes a marker when output is too long", async () => {
    const long = "x".repeat(MAX_LOG_CHARS + 500);
    const execute = runTool(long);

    const output = await execute({ command: "pip install manim" }, EXEC_CTX);

    expect(output.output).toMatch(TRUNCATED);
    expect(output.output).toContain("truncated 500 earlier characters");
    // The marker plus exactly the last MAX_LOG_CHARS of the original output.
    expect(output.output.endsWith("x".repeat(MAX_LOG_CHARS))).toBe(true);
  });
});

const MASTER = "/home/daytona/project/media/videos/scene/1080p60/Main.mp4";
const MUSIC_MASTER =
  "/home/daytona/project/media/videos/scene/1080p60/Main.music.mp4";
const STAGED_TRACK = "/home/daytona/project/.background-music.mp3";
const MUSIC_URL = "https://r2.example/music?sig=abc";
const MUSIC_SKIPPED = /background music skipped/;

const SCENE_PATH = "/home/daytona/project/scene.py";

function renderSandbox(opts: {
  renderExit?: number;
  muxExit?: number;
  sceneSource?: string;
}) {
  const downloadCalls: string[] = [];
  const meter = { ttsChars: 0 };
  const saveVideo = vi.fn(() =>
    Promise.resolve("videos/conv/Main-ab12cd34.mp4")
  );
  const backgroundMusicUrl = vi.fn(() => Promise.resolve(MUSIC_URL));
  const executeCommand = vi.fn(
    (command: string, _cwd?: string, _env?: Record<string, string>) => {
      if (command.includes("manim render")) {
        return Promise.resolve({
          exitCode: opts.renderExit ?? 0,
          result: `Rendering scene\nFile ready at '${MASTER}'\n`,
        });
      }
      // download + ffmpeg mux
      return Promise.resolve({ exitCode: opts.muxExit ?? 0, result: "" });
    }
  );
  const sandbox = {
    process: { executeCommand },
    fs: {
      downloadFile: vi.fn((path: string) => {
        downloadCalls.push(path);
        // The scene source is read for narration metering; everything else is
        // the rendered video.
        if (path === SCENE_PATH) {
          return Promise.resolve(Buffer.from(opts.sceneSource ?? "", "utf8"));
        }
        return Promise.resolve(Buffer.from("video-bytes"));
      }),
    },
  } as unknown as Sandbox;
  const tools = createManimTools({
    sandbox,
    conversationId: "conv",
    saveVideo,
    backgroundMusicUrl,
    elevenLabsApiKey: "el-test-key",
    meter,
  });
  const render = tools.renderScene;
  if (!render?.execute) {
    throw new Error("renderScene tool is not executable");
  }
  return {
    execute: render.execute,
    downloadCalls,
    saveVideo,
    executeCommand,
    meter,
  };
}

const RENDER_INPUT = {
  file: "scene.py",
  scene: "Main",
  quality: "high",
} as const;

describe("renderScene background music", () => {
  it("downloads the track in-sandbox, muxes it, and delivers the muxed file", async () => {
    const { execute, downloadCalls, saveVideo, executeCommand } = renderSandbox(
      {}
    );

    const output = await execute(RENDER_INPUT, EXEC_CTX);

    expect(output.ok).toBe(true);
    expect(output.videoKey).toBe("videos/conv/Main-ab12cd34.mp4");
    // Second sandbox command downloads the track then muxes it; the presigned
    // URL rides in the env, not the command string.
    const [muxCommand, , muxEnv] = executeCommand.mock.calls[1] ?? [];
    expect(muxCommand).toContain("urlretrieve");
    expect(muxCommand).toContain("ffmpeg");
    expect(muxCommand).toContain(STAGED_TRACK);
    expect(muxCommand).toContain(MUSIC_MASTER);
    // Music is mixed UNDER the narration (amix), not replacing the audio.
    expect(muxCommand).toContain("amix");
    expect(muxEnv).toEqual({ MUSIC_URL });
    // The scene source is read first (for narration metering), then the muxed
    // file (not the silent master) is what gets uploaded.
    expect(downloadCalls).toEqual([SCENE_PATH, MUSIC_MASTER]);
    expect(saveVideo).toHaveBeenCalledTimes(1);
  });

  it("falls back to the silent master when the music step fails", async () => {
    const { execute, downloadCalls, saveVideo } = renderSandbox({ muxExit: 1 });

    const output = await execute(RENDER_INPUT, EXEC_CTX);

    expect(output.ok).toBe(true);
    expect(output.videoKey).toBe("videos/conv/Main-ab12cd34.mp4");
    expect(output.logs).toMatch(MUSIC_SKIPPED);
    // Scene source read for metering, then the silent master (never the failed
    // muxed file).
    expect(downloadCalls).toEqual([SCENE_PATH, MASTER]);
    expect(saveVideo).toHaveBeenCalledTimes(1);
  });

  it("does not run the music step or deliver when the render fails", async () => {
    const { execute, saveVideo, executeCommand } = renderSandbox({
      renderExit: 1,
    });

    const output = await execute(RENDER_INPUT, EXEC_CTX);

    expect(output.ok).toBe(false);
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(saveVideo).not.toHaveBeenCalled();
  });
});

describe("renderScene TTS metering", () => {
  it("accumulates synthesized narration characters into the meter", async () => {
    const sceneSource = `
      with self.voiceover(text="Hello there") as t1:
          self.play(Write(a))
      with self.voiceover(text="Second line") as t2:
          self.play(Write(b))
    `;
    const { execute, meter } = renderSandbox({ sceneSource });

    await execute(RENDER_INPUT, EXEC_CTX);

    expect(meter.ttsChars).toBe("Hello there".length + "Second line".length);
  });

  it("injects the effective ElevenLabs key into the render command env", async () => {
    const { execute, executeCommand } = renderSandbox({});

    await execute(RENDER_INPUT, EXEC_CTX);

    const [renderCommand, , renderEnv] = executeCommand.mock.calls[0] ?? [];
    expect(renderCommand).toContain("manim render");
    expect(renderEnv).toEqual({
      ELEVEN_API_KEY: "el-test-key",
      ELEVENLABS_API_KEY: "el-test-key",
    });
  });

  it("meters nothing when the render fails", async () => {
    const { execute, meter } = renderSandbox({
      renderExit: 1,
      sceneSource: 'self.voiceover(text="unused")',
    });

    await execute(RENDER_INPUT, EXEC_CTX);

    expect(meter.ttsChars).toBe(0);
  });
});
