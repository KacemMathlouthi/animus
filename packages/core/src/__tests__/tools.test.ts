import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AskUserQuestionInputSchema,
  EditFileInputSchema,
  ListFilesInputSchema,
  ReadFileInputSchema,
  RenderSceneInputSchema,
  RunCommandInputSchema,
  VideoPlanSchema,
  WebFetchInputSchema,
  WebSearchInputSchema,
  WriteFileInputSchema,
} from "../tools/index.ts";

/** Every input field the model fills in. JSDoc on a schema field is erased at
 * compile time; only `.describe()` reaches the JSON schema the model reads. */
const INPUT_SCHEMAS = {
  askUserQuestion: AskUserQuestionInputSchema,
  editFile: EditFileInputSchema,
  finalizeVideoPlan: VideoPlanSchema,
  listFiles: ListFilesInputSchema,
  readFile: ReadFileInputSchema,
  renderScene: RenderSceneInputSchema,
  runCommand: RunCommandInputSchema,
  webFetch: WebFetchInputSchema,
  webSearch: WebSearchInputSchema,
  writeFile: WriteFileInputSchema,
};

interface JsonSchemaNode {
  description?: string;
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
}

function undescribedFields(node: JsonSchemaNode, prefix = ""): string[] {
  const missing: string[] = [];
  for (const [name, field] of Object.entries(node.properties ?? {})) {
    const path = `${prefix}${name}`;
    if (!field.description) {
      missing.push(path);
    }
    missing.push(...undescribedFields(field, `${path}.`));
    if (field.items) {
      missing.push(...undescribedFields(field.items, `${path}[].`));
    }
  }
  return missing;
}

describe("tool input schemas", () => {
  it.each(
    Object.entries(INPUT_SCHEMAS)
  )("%s describes every field the model fills in", (_name, schema) => {
    const json = z.toJSONSchema(schema, { io: "input" }) as JsonSchemaNode;
    expect(undescribedFields(json)).toEqual([]);
  });

  it("keeps the defaults that make optional fields optional", () => {
    expect(RenderSceneInputSchema.parse({ file: "s.py", scene: "S" })).toEqual({
      file: "s.py",
      scene: "S",
      quality: "high",
    });
    expect(ListFilesInputSchema.parse({})).toEqual({ path: "." });
    expect(
      EditFileInputSchema.parse({ path: "s.py", oldString: "a", newString: "" })
        .replaceAll
    ).toBe(false);
  });

  it("still rejects unknown fields and duplicate option labels", () => {
    expect(
      RunCommandInputSchema.safeParse({ command: "ls", cwd: "/" }).success
    ).toBe(false);
    expect(
      AskUserQuestionInputSchema.safeParse({
        question: "?",
        options: [{ label: "a" }, { label: "a" }],
      }).success
    ).toBe(false);
  });
});
