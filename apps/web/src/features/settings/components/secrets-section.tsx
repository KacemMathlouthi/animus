import { ChevronsUpDownIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import {
	EnvironmentVariable,
	EnvironmentVariableCopyButton,
	EnvironmentVariableName,
	EnvironmentVariables,
	EnvironmentVariablesContent,
	EnvironmentVariablesHeader,
	EnvironmentVariablesToggle,
	EnvironmentVariableValue,
} from "@/components/ai-elements/environment-variables";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVIDERS } from "../data/providers";
import { SectionHeading, SettingsSaveBar } from "./settings-ui";

interface SavedKey {
	providerId: string;
	key: string;
}

const EMPTY: SavedKey = { providerId: PROVIDERS[0].id, key: "" };

export function SecretsSection() {
	const [providerId, setProviderId] = useState(PROVIDERS[0].id);
	const [keyInput, setKeyInput] = useState("");
	const [reveal, setReveal] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [saved, setSaved] = useState<SavedKey>(EMPTY);

	const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];
	const ProviderIcon = provider.icon;
	const savedProvider = PROVIDERS.find((p) => p.id === saved.providerId);

	const dirty = providerId !== saved.providerId || keyInput !== saved.key;

	function handleSave() {
		setSaved({ providerId, key: keyInput.trim() });
		setReveal(false);
	}

	function handleReset() {
		setProviderId(saved.providerId);
		setKeyInput(saved.key);
		setReveal(false);
	}

	return (
		<div>
			<SectionHeading
				description="Bring your own provider key for unlimited generation."
				title="API keys"
			/>

			<div className="max-w-md space-y-4">
				<div className="space-y-2">
					<p className="font-medium text-sm">Provider</p>
					<ModelSelector onOpenChange={setPickerOpen} open={pickerOpen}>
						<ModelSelectorTrigger asChild>
							<Button
								aria-expanded={pickerOpen}
								className="w-full justify-between"
								role="combobox"
								variant="outline"
							>
								<span className="flex items-center gap-2">
									<ProviderIcon size={16} />
									{provider.name}
								</span>
								<ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
							</Button>
						</ModelSelectorTrigger>
						<ModelSelectorContent>
							<ModelSelectorInput placeholder="Search providers…" />
							<ModelSelectorList>
								<ModelSelectorEmpty>No provider found.</ModelSelectorEmpty>
								<ModelSelectorGroup>
									{PROVIDERS.map((item) => {
										const ItemIcon = item.icon;
										return (
											<ModelSelectorItem
												key={item.id}
												onSelect={() => {
													setProviderId(item.id);
													setPickerOpen(false);
												}}
												value={item.name}
											>
												<ItemIcon size={16} />
												<ModelSelectorName>{item.name}</ModelSelectorName>
											</ModelSelectorItem>
										);
									})}
								</ModelSelectorGroup>
							</ModelSelectorList>
						</ModelSelectorContent>
					</ModelSelector>
				</div>

				<div className="space-y-2">
					<label className="font-medium text-sm" htmlFor="api-key">
						API key
					</label>
					<div className="relative">
						<Input
							autoComplete="off"
							className="pr-9 font-mono"
							id="api-key"
							onChange={(event) => setKeyInput(event.target.value)}
							placeholder={provider.placeholder}
							spellCheck={false}
							type={reveal ? "text" : "password"}
							value={keyInput}
						/>
						<button
							aria-label={reveal ? "Hide key" : "Show key"}
							className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground hover:text-foreground"
							onClick={() => setReveal((value) => !value)}
							type="button"
						>
							{reveal ? (
								<EyeOffIcon className="size-4" />
							) : (
								<EyeIcon className="size-4" />
							)}
						</button>
					</div>
					<a
						className="text-muted-foreground text-xs underline-offset-4 hover:underline"
						href={provider.docsUrl}
						rel="noreferrer"
						target="_blank"
					>
						Get a {provider.name} key
					</a>
				</div>

				{saved.key && savedProvider ? (
					<EnvironmentVariables>
						<EnvironmentVariablesHeader>
							<span className="font-medium text-sm">Saved key</span>
							<EnvironmentVariablesToggle />
						</EnvironmentVariablesHeader>
						<EnvironmentVariablesContent>
							<EnvironmentVariable
								name={savedProvider.envKey}
								value={saved.key}
							>
								<EnvironmentVariableName />
								<div className="flex items-center gap-2">
									<EnvironmentVariableValue />
									<EnvironmentVariableCopyButton />
								</div>
							</EnvironmentVariable>
						</EnvironmentVariablesContent>
					</EnvironmentVariables>
				) : null}
			</div>

			<SettingsSaveBar
				dirty={dirty}
				onReset={handleReset}
				onSave={handleSave}
			/>
		</div>
	);
}
