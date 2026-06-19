/** The agent's tool registry. Empty for now — the sandbox, Manim render, and
 * file tools land here as we build the render/repair loop. Keeping it as a typed
 * ToolSet means adding a tool is a single entry and the agent loop is unchanged. */

import type { ToolSet } from "ai";

export const tools: ToolSet = {};
