/** LLM observability via Braintrust. The Vercel AI SDK emits OpenTelemetry
 * spans when a call sets `experimental_telemetry`; we register a global tracer
 * provider whose span processor ships those spans to Braintrust's OTLP endpoint.
 */

import { getServerEnv } from "@animus/core/env";
import { BraintrustSpanProcessor } from "@braintrust/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import type { TelemetrySettings } from "ai";
import { logger } from "../lib/logger.ts";

let enabled = false;
let provider: NodeTracerProvider | null = null;

/** Stand up the Braintrust-backed tracer provider once, at process start. */
export function initTelemetry(): boolean {
  if (provider) {
    return enabled;
  }

  const env = getServerEnv();
  if (!env.braintrustApiKey) {
    logger.info("telemetry disabled (no BRAINTRUST_API_KEY)");
    return false;
  }

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "animus-api" }),
    spanProcessors: [
      new BraintrustSpanProcessor({
        apiKey: env.braintrustApiKey,
        parent: `project_name:${env.braintrustProject}`,
        filterAISpans: true,
      }),
    ],
  });
  provider.register();
  enabled = true;
  logger.info(
    { project: env.braintrustProject },
    "telemetry enabled (braintrust)"
  );
  return true;
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

export function aiTelemetry(opts: {
  functionId: string;
  metadata?: Record<string, string | number | boolean>;
}): TelemetrySettings {
  return {
    isEnabled: enabled,
    functionId: opts.functionId,
    metadata: opts.metadata,
  };
}
