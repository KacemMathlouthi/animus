import type { Sandbox } from "@daytonaio/sdk";
import { describe, expect, it, vi } from "vitest";
import { createManimTools } from "../tools/manim.ts";

const EXEC_CTX = { messages: [], toolCallId: "call-1" };

/** A fake Daytona sandbox holding a single in-memory file, exposing only the
 * fs methods editFile touches. replaceInFiles mimics Daytona's server-side
 * replace-all behaviour so the tool's own validation is what's under test. */
function createFakeSandbox(initial: Record<string, string>): {
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
  });
  const edit = tools.editFile;
  if (!edit?.execute) {
    throw new Error("editFile tool is not executable");
  }
  return { execute: edit.execute, state };
}

const ABS = "/home/daytona/project/scene.py";
const NOT_FOUND = /was not found/;
const AMBIGUOUS = /matches 2 times/;
const IDENTICAL = /identical/;

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
