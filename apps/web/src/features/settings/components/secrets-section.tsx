import type { ProviderKeyPreview } from "@animus/core";
import { ChevronsUpDownIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { apiFetch } from "@/lib/api";
import { PROVIDERS } from "../data/providers";
import { SectionHeading, SettingsSaveBar } from "./settings-ui";

export function SecretsSection() {
	const [providerId, setProviderId] = useState(PROVIDERS[0].id);
	const [keyInput, setKeyInput] = useState("");
	const [reveal, setReveal] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [saved, setSaved] = useState<ProviderKeyPreview | null>(null);
	const [saving, setSaving] = useState(false);

	// Load the current key's masked preview (if any).
	useEffect(() => {
		let active = true;
		apiFetch<{ key: ProviderKeyPreview | null }>("/settings/keys")
			.then((data) => {
				if (!(active && data.key)) {
					return;
				}
				setSaved(data.key);
				setProviderId(data.key.provider);
			})
			.catch(() => {
				// No key yet, or offline — leave the form empty.
			});
		return () => {
			active = false;
		};
	}, []);

	const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];
	const ProviderIcon = provider.icon;
	const savedProvider = saved
		? PROVIDERS.find((p) => p.id === saved.provider)
		: undefined;
	const SavedIcon = savedProvider?.icon;

	// A key must be entered to save — provider-specific, so we never reuse an old one.
	const dirty = keyInput.trim().length > 0;

	async function handleSave() {
		const key = keyInput.trim();
		if (!key) {
			return;
		}
		setSaving(true);
		try {
			const data = await apiFetch<{ key: ProviderKeyPreview }>(
				"/settings/keys",
				{
					method: "PUT",
					body: JSON.stringify({ provider: providerId, key }),
				},
			);
			setSaved(data.key);
			setKeyInput("");
			setReveal(false);
		} catch {
			// Leave the input so the user can retry.
		} finally {
			setSaving(false);
		}
	}

	async function handleRemove() {
		setSaving(true);
		try {
			await apiFetch("/settings/keys", { method: "DELETE" });
			setSaved(null);
			setKeyInput("");
			setReveal(false);
		} catch {
			// Ignore; the key stays until the next attempt.
		} finally {
			setSaving(false);
		}
	}

	function handleReset() {
		setProviderId(saved?.provider ?? PROVIDERS[0].id);
		setKeyInput("");
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

				{saved ? (
					<div className="flex items-center justify-between rounded-lg border p-3">
						<div className="flex items-center gap-2 text-sm">
							{SavedIcon ? <SavedIcon size={16} /> : null}
							<span className="font-medium">
								{savedProvider?.name ?? saved.provider}
							</span>
							<span className="font-mono text-muted-foreground">
								••••{saved.last4}
							</span>
						</div>
						<Button
							disabled={saving}
							onClick={() => {
								void handleRemove();
							}}
							size="sm"
							variant="ghost"
						>
							Remove
						</Button>
					</div>
				) : null}
			</div>

			<SettingsSaveBar
				dirty={dirty}
				onReset={handleReset}
				onSave={() => {
					void handleSave();
				}}
				saving={saving}
			/>
		</div>
	);
}
