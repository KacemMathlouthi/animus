import type {
	WebFetchInput,
	WebFetchOutput,
	WebResult,
	WebSearchInput,
	WebSearchOutput,
} from "@animus/core/tools";
import {
	ExternalLinkIcon,
	FileTextIcon,
	GlobeIcon,
	SearchIcon,
} from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const resultCardClassName =
	"block w-full min-w-0 rounded-sm border bg-background/70 py-1.5 pr-3 pl-2 transition-colors hover:bg-muted/60";

function httpUrl(url: string): string | undefined {
	try {
		const parsed = new URL(url);
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed.href;
		}
	} catch {
		return undefined;
	}

	return undefined;
}

function hostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function faviconUrl(result: WebResult): string | undefined {
	if (result.favicon) {
		return result.favicon;
	}

	try {
		const url = httpUrl(result.url);
		if (!url) {
			return undefined;
		}
		return `${new URL(url).origin}/favicon.ico`;
	} catch {
		return undefined;
	}
}

function Favicon({ result }: { result: WebResult }) {
	const src = faviconUrl(result);
	return (
		<span className="flex size-6 items-center justify-center rounded-sm border bg-background shadow-xs">
			{src ? (
				<img
					alt=""
					className="size-3.5 rounded-[2px]"
					height={14}
					src={src}
					width={14}
				/>
			) : (
				<GlobeIcon className="size-3.5 text-muted-foreground" />
			)}
		</span>
	);
}

function ResultList({ results }: { results: WebResult[] }) {
	const seenKeys = new Map<string, number>();

	return (
		<ul className="grid w-full min-w-0 gap-1.5 overflow-hidden px-2">
			{results.slice(0, 5).map((result) => {
				const href = httpUrl(result.url);
				const keyBase = `${result.url}:${result.title}`;
				const seenCount = seenKeys.get(keyBase) ?? 0;
				seenKeys.set(keyBase, seenCount + 1);
				const content = (
					<div className="flex min-w-0 items-center gap-2">
						<div className="shrink-0">
							<Favicon result={result} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 items-center gap-2">
								<p className="min-w-0 flex-1 truncate font-medium text-sm">
									{result.title}
								</p>
								{href ? (
									<ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
								) : null}
							</div>
							<p className="truncate text-muted-foreground text-xs">
								{hostname(result.url)}
							</p>
						</div>
					</div>
				);

				return (
					<li className="min-w-0" key={`${keyBase}:${seenCount}`}>
						{href ? (
							<a
								className={resultCardClassName}
								href={href}
								rel="noreferrer"
								target="_blank"
							>
								{content}
							</a>
						) : (
							<div className={resultCardClassName}>{content}</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export function WebSearchTool({
	input,
	output,
}: {
	input: WebSearchInput;
	output?: WebSearchOutput;
}) {
	if (!output) {
		return <Shimmer>Searching the web…</Shimmer>;
	}

	return (
		<div className="my-3 max-w-full overflow-hidden rounded-sm border bg-card p-2.5">
			<div className="mb-2 flex items-center gap-2">
				<SearchIcon className="size-4 text-muted-foreground" />
				<div className="min-w-0">
					<p className="font-medium text-sm">Searched the web</p>
					<p className="truncate text-muted-foreground text-xs">
						{input.query}
					</p>
				</div>
			</div>
			<ResultList results={output.results} />
		</div>
	);
}

export function WebFetchTool({
	input,
	output,
}: {
	input: WebFetchInput;
	output?: WebFetchOutput;
}) {
	if (!output) {
		return <Shimmer>Reading pages…</Shimmer>;
	}

	return (
		<div className="my-3 max-w-full overflow-hidden rounded-sm border bg-card p-2.5">
			<div className="mb-2 flex items-center gap-2">
				<FileTextIcon className="size-4 text-muted-foreground" />
				<div className="min-w-0">
					<p className="font-medium text-sm">Read pages</p>
					<p className="truncate text-muted-foreground text-xs">
						{input.urls.map(hostname).join(", ")}
					</p>
				</div>
			</div>
			<ResultList results={output.results} />
		</div>
	);
}
