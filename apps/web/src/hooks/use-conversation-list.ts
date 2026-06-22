import type { ConversationSummary } from "@animus/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	type ConversationGroup,
	groupConversations,
	listConversations,
} from "@/lib/conversations";

const SEARCH_DEBOUNCE_MS = 180;
const PAGE_SIZE = 30;

type ConversationListState = {
	groups: ConversationGroup[];
	query: string;
	loading: boolean;
	loadingMore: boolean;
	error: boolean;
	hasMore: boolean;
	loadMoreRef: React.RefObject<HTMLDivElement | null>;
};

/** The sidebar conversation list: debounced search, offset pagination driven by
 * an intersection observer, and a refresh whenever the conversation set changes
 * elsewhere (`animus:conversations-changed`). Row actions live in the component;
 * they mutate and then fire that event, which this hook listens for. */
export function useConversationList(search: string): ConversationListState {
	const [query, setQuery] = useState(search);
	const [items, setItems] = useState<ConversationSummary[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(false);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const hasMore = items.length < total;

	useEffect(() => {
		const timeout = window.setTimeout(
			() => setQuery(search),
			SEARCH_DEBOUNCE_MS,
		);
		return () => window.clearTimeout(timeout);
	}, [search]);

	useEffect(() => {
		let cancelled = false;
		const load = () => {
			setLoading(true);
			setError(false);
			void listConversations({ limit: PAGE_SIZE, query })
				.then((response) => {
					if (!cancelled) {
						setItems(response.conversations);
						setTotal(response.total);
					}
				})
				.catch(() => {
					if (!cancelled) {
						setError(true);
					}
				})
				.finally(() => {
					if (!cancelled) {
						setLoading(false);
					}
				});
		};

		load();
		window.addEventListener("animus:conversations-changed", load);
		return () => {
			cancelled = true;
			window.removeEventListener("animus:conversations-changed", load);
		};
	}, [query]);

	useEffect(() => {
		const target = loadMoreRef.current;
		if (!(target && hasMore)) {
			return;
		}

		let cancelled = false;
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting || loadingMore || !hasMore) {
					return;
				}
				setLoadingMore(true);
				void listConversations({
					limit: PAGE_SIZE,
					offset: items.length,
					query,
				})
					.then((response) => {
						if (cancelled) {
							return;
						}
						setItems((current) => {
							const seen = new Set(current.map((item) => item.id));
							return [
								...current,
								...response.conversations.filter((item) => !seen.has(item.id)),
							];
						});
						setTotal(response.total);
					})
					.catch(() => {
						if (!cancelled) {
							setError(true);
						}
					})
					.finally(() => {
						if (!cancelled) {
							setLoadingMore(false);
						}
					});
			},
			{ rootMargin: "160px" },
		);

		observer.observe(target);
		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [hasMore, loadingMore, query, items.length]);

	const groups = useMemo(() => groupConversations(items), [items]);

	return {
		groups,
		query,
		loading,
		loadingMore,
		error,
		hasMore,
		loadMoreRef,
	};
}
