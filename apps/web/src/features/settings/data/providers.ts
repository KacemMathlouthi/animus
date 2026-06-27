/** Web view of the shared provider registry (@animus/core), with each provider's
 * brand logo from @lobehub/icons attached (a web-only concern). Adding a provider
 * is still a single entry in core — just map its icon here. */

import { PROVIDERS as PROVIDER_INFO, type ProviderId } from "@animus/core";
import {
	Anthropic,
	Gemini,
	Grok,
	Groq,
	type IconType,
	Mistral,
	OpenAI,
} from "@lobehub/icons";

const ICONS: Record<ProviderId, IconType> = {
	openai: OpenAI,
	anthropic: Anthropic,
	google: Gemini,
	mistral: Mistral,
	groq: Groq,
	xai: Grok,
};

export interface Provider {
	id: ProviderId;
	name: string;
	envKey: string;
	placeholder: string;
	docsUrl: string;
	icon: IconType;
}

export const PROVIDERS: Provider[] = PROVIDER_INFO.map((provider) => ({
	...provider,
	icon: ICONS[provider.id],
}));
