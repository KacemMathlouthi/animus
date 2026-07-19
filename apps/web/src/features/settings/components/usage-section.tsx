/** The usage ledger: the balance card plus a paginated table of every settled
 * turn — when, which conversation, which model, tokens, TTS characters, and
 * what it cost. The itemized view of where the credits went. */

import {
	formatUsdPrecise,
	type UsageEventItem,
	type UsageList,
} from "@animus/core";
import { Anthropic, Bedrock, ElevenLabs, Gemini, OpenAI } from "@lobehub/icons";
import { KeyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BalanceSection } from "@/components/balance-section";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCredits } from "@/hooks/use-credits";
import { apiFetch } from "@/lib/api";
import { SectionHeading } from "./section-heading";

const PAGE_SIZE = 50;

/** Provider brand icon for a metered model id (Bedrock profile ids embed the
 * vendor, BYOK model ids start with it). */
function modelIcon(model: string) {
	if (/anthropic|claude/i.test(model)) {
		return Anthropic;
	}
	if (/openai|gpt|^o\d/i.test(model)) {
		return OpenAI;
	}
	if (/google|gemini/i.test(model)) {
		return Gemini;
	}
	return Bedrock;
}

/** The vendor-prefixed Bedrock profile id, shortened to the model name
 * (`us.anthropic.claude-sonnet-5` → `claude-sonnet-5`). */
function shortModel(model: string): string {
	const lastSegment = model.split(".").at(-1);
	return lastSegment ?? model;
}

function formatWhen(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatCount(value: number): string {
	return value === 0 ? "—" : value.toLocaleString();
}

function ModelCell({ model }: { model: string | null }) {
	if (!model) {
		return (
			<span className="flex items-center gap-1.5 text-muted-foreground">
				<KeyIcon aria-hidden="true" className="size-3.5 shrink-0" />
				Your key
			</span>
		);
	}
	const Icon = modelIcon(model);
	return (
		<span className="flex items-center gap-1.5">
			<Icon aria-hidden="true" className="shrink-0" size={14} />
			<span className="max-w-40 truncate" title={model}>
				{shortModel(model)}
			</span>
		</span>
	);
}

function TtsCell({ chars }: { chars: number }) {
	if (chars === 0) {
		return <span className="text-muted-foreground">—</span>;
	}
	return (
		<span className="inline-flex items-center gap-1.5 tabular-nums">
			<ElevenLabs aria-hidden="true" className="shrink-0" size={12} />
			{chars.toLocaleString()}
		</span>
	);
}

function ConversationCell({ item }: { item: UsageEventItem }) {
	const label =
		item.conversationTitle ??
		(item.conversationId ? `${item.conversationId.slice(0, 8)}…` : "—");
	return (
		<div className="min-w-0">
			{item.conversationId && item.conversationTitle ? (
				<Link
					className="block max-w-48 truncate hover:underline"
					title={item.conversationTitle}
					to={`/studio/c/${item.conversationId}`}
				>
					{label}
				</Link>
			) : (
				<span className="block max-w-48 truncate text-muted-foreground">
					{label}
				</span>
			)}
			<span
				className="block truncate font-mono text-[10px] text-muted-foreground"
				title={item.turnId}
			>
				{item.turnId.slice(0, 13)}…
			</span>
		</div>
	);
}

export function UsageSection() {
	const navigate = useNavigate();
	const { balance, fraction } = useCredits();
	const [page, setPage] = useState<UsageList | null>(null);
	const [offset, setOffset] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setLoading(true);
		apiFetch<UsageList>(
			`/api/credits/usage?limit=${PAGE_SIZE}&offset=${offset}`,
		)
			.then((data) => {
				if (active) {
					setPage(data);
				}
			})
			.catch(() => {
				// Leave the previous page (or the empty state) in place.
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});
		return () => {
			active = false;
		};
	}, [offset]);

	const items = page?.items ?? [];
	const total = page?.total ?? 0;
	const from = total === 0 ? 0 : offset + 1;
	const to = Math.min(offset + PAGE_SIZE, total);

	return (
		<div className="space-y-8">
			<SectionHeading
				description="Every metered turn, itemized: what ran, on which conversation, and what it cost."
				title="Usage"
			/>

			{balance ? (
				<BalanceSection
					balance={balance}
					fraction={fraction}
					onNavigateToKeys={() => navigate("/settings/secrets")}
					variant="card"
				/>
			) : null}

			<div className="space-y-3">
				<div className="rounded-md border">
					<Table className="text-xs">
						<TableHeader>
							<TableRow>
								<TableHead className="h-8 text-xs">Date</TableHead>
								<TableHead className="h-8 text-xs">Conversation</TableHead>
								<TableHead className="h-8 text-xs">Model</TableHead>
								<TableHead className="h-8 text-xs">Input</TableHead>
								<TableHead className="h-8 text-xs">Output</TableHead>
								<TableHead className="h-8 text-xs">TTS</TableHead>
								<TableHead className="h-8 text-xs">Cost</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="whitespace-nowrap py-1.5 text-muted-foreground">
										{formatWhen(item.createdAt)}
									</TableCell>
									<TableCell className="py-1.5">
										<ConversationCell item={item} />
									</TableCell>
									<TableCell className="whitespace-nowrap py-1.5">
										<ModelCell model={item.model} />
									</TableCell>
									<TableCell className="whitespace-nowrap py-1.5 tabular-nums">
										{formatCount(item.inputTokens)}
									</TableCell>
									<TableCell className="whitespace-nowrap py-1.5 tabular-nums">
										{formatCount(item.outputTokens)}
									</TableCell>
									<TableCell className="whitespace-nowrap py-1.5">
										<TtsCell chars={item.ttsChars} />
									</TableCell>
									<TableCell className="whitespace-nowrap py-1.5 font-medium tabular-nums">
										{formatUsdPrecise(item.costMicros)}
									</TableCell>
								</TableRow>
							))}
							{items.length === 0 ? (
								<TableRow className="hover:bg-transparent">
									<TableCell
										className="py-10 text-center text-muted-foreground"
										colSpan={7}
									>
										{loading
											? "Loading usage…"
											: "No usage yet. Metered turns will appear here."}
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</div>

				<div className="flex items-center justify-between text-muted-foreground text-xs">
					<span>{total === 0 ? "0 entries" : `${from}–${to} of ${total}`}</span>
					<div className="flex gap-2">
						<Button
							disabled={loading || offset === 0}
							onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
							size="sm"
							variant="outline"
						>
							Previous
						</Button>
						<Button
							disabled={loading || offset + PAGE_SIZE >= total}
							onClick={() => setOffset(offset + PAGE_SIZE)}
							size="sm"
							variant="outline"
						>
							Next
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
