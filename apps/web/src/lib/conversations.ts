import type {
  ConversationListResponse,
  ConversationSummary,
  CreateConversationResponse,
  RenameConversationInput,
} from "@animus/core";
import type { UIMessage } from "ai";
import { apiFetch } from "@/lib/api";

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: UIMessage[];
}

export interface ConversationGroup {
  items: ConversationSummary[];
  label: string;
}

export interface ListConversationsOptions {
  limit?: number;
  offset?: number;
  query?: string;
}

export async function createConversation() {
  const response = await apiFetch<CreateConversationResponse>(
    "/api/conversations",
    { method: "POST" }
  );
  return response.conversation;
}

export async function listConversations(
  options: ListConversationsOptions = {}
) {
  const params = new URLSearchParams();
  const search = options.query?.trim();
  if (search) {
    params.set("q", search);
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.offset) {
    params.set("offset", String(options.offset));
  }
  const query = params.toString();
  return await apiFetch<ConversationListResponse>(
    query ? `/api/conversations?${query}` : "/api/conversations"
  );
}

export async function getConversation(id: string) {
  return await apiFetch<ConversationDetail>(`/api/conversations/${id}`);
}

export async function renameConversation(
  id: string,
  input: RenameConversationInput
) {
  const response = await apiFetch<CreateConversationResponse>(
    `/api/conversations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.conversation;
}

export async function deleteConversation(id: string) {
  await apiFetch<{ ok: true }>(`/api/conversations/${id}`, {
    method: "DELETE",
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysAgo(date: Date, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((start.getTime() - then.getTime()) / 86_400_000);
}

export function groupConversations(
  conversations: ConversationSummary[],
  now = new Date()
): ConversationGroup[] {
  const groups = new Map<string, ConversationSummary[]>();

  for (const conversation of conversations) {
    const date = new Date(conversation.lastMessageAt ?? conversation.updatedAt);
    const age = daysAgo(date, now);
    let label: string;

    if (sameDay(date, now)) {
      label = "Today";
    } else if (age === 1) {
      label = "Yesterday";
    } else if (age < 7) {
      label = "Previous 7 days";
    } else {
      label = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }

    groups.set(label, [...(groups.get(label) ?? []), conversation]);
  }

  return Array.from(groups, ([label, items]) => ({ label, items }));
}

export function notifyConversationsChanged() {
  window.dispatchEvent(new Event("animus:conversations-changed"));
}
