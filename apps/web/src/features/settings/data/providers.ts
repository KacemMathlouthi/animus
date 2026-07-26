/** Web view of the shared LLM provider registry (@animus/core), with each
 * provider's brand logo from @lobehub/icons attached (a web-only concern).
 * Adding a provider is still a single entry in core — just map its icon here. */

import {
  type ModelOption,
  PROVIDERS as PROVIDER_INFO,
  type ProviderId,
} from "@animus/core";
import { Anthropic, Gemini, type IconType, OpenAI } from "@lobehub/icons";

const ICONS: Record<ProviderId, IconType> = {
  openai: OpenAI,
  anthropic: Anthropic,
  google: Gemini,
};

export interface Provider {
  docsUrl: string;
  envKey: string;
  icon: IconType;
  id: ProviderId;
  models: readonly ModelOption[];
  name: string;
  placeholder: string;
}

export const PROVIDERS: Provider[] = PROVIDER_INFO.map((provider) => ({
  ...provider,
  icon: ICONS[provider.id],
}));
