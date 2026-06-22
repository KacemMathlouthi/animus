import { ilike } from "@animus/db";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockCount,
  mockInsertValues,
  mockTransaction,
  mockTxDeleteWhere,
  mockTxInsertValues,
  mockTxUpdateWhere,
  mockUpdateReturning,
  mockDeleteReturning,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCount: vi.fn(),
  mockInsertValues: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxDeleteWhere: vi.fn(),
  mockTxInsertValues: vi.fn(),
  mockTxUpdateWhere: vi.fn(),
  mockUpdateReturning: vi.fn(),
  mockDeleteReturning: vi.fn(),
}));

vi.mock("@animus/db", () => ({
  and: vi.fn((...args) => ({ and: args })),
  asc: vi.fn((value) => ({ asc: value })),
  conversation: {
    id: "conversation.id",
    userId: "conversation.user_id",
    title: "conversation.title",
    updatedAt: "conversation.updated_at",
  },
  conversationMessage: {
    conversationId: "conversation_message.conversation_id",
    position: "conversation_message.position",
    textContent: "conversation_message.text_content",
  },
  db: {
    $count: mockCount,
    query: {
      conversation: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
      },
    },
    insert: () => ({ values: mockInsertValues }),
    select: () => ({ from: () => ({ where: () => ({ subquery: true }) }) }),
    transaction: mockTransaction,
    update: () => ({
      set: () => ({ where: () => ({ returning: mockUpdateReturning }) }),
    }),
    delete: () => ({ where: () => ({ returning: mockDeleteReturning }) }),
  },
  desc: vi.fn((value) => ({ desc: value })),
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  exists: vi.fn((subquery) => ({ exists: subquery })),
  ilike: vi.fn((left, right) => ({ ilike: [left, right] })),
  or: vi.fn((...args) => ({ or: args })),
}));

const {
  createConversation,
  deleteConversation,
  isUIMessage,
  listConversations,
  loadOwnedConversation,
  mergeIncomingMessage,
  renameConversation,
  saveConversationMessages,
  serializeConversation,
  textOf,
} = await import("../services/conversations.ts");

const NOW = new Date("2026-06-21T12:00:00.000Z");
const userMessage = {
  id: "msg-user",
  role: "user",
  parts: [{ type: "text", text: "Explain eigenvectors" }],
} satisfies UIMessage;
const assistantMessage = {
  id: "msg-assistant",
  role: "assistant",
  parts: [{ type: "text", text: "Eigenvectors keep direction." }],
} satisfies UIMessage;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "conversation-1",
    userId: "user-1",
    title: "Explaining Eigenvectors",
    titleStatus: "generated",
    createdAt: NOW,
    updatedAt: NOW,
    lastMessageAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockInsertValues.mockResolvedValue(undefined);
  mockTransaction.mockImplementation(async (callback) => {
    const tx = {
      delete: () => ({ where: mockTxDeleteWhere }),
      insert: () => ({ values: mockTxInsertValues }),
      update: () => ({
        set: () => ({ where: mockTxUpdateWhere }),
      }),
    };
    await callback(tx);
  });
});

describe("conversation service helpers", () => {
  it("serializes database rows for the API", () => {
    expect(serializeConversation(row())).toEqual({
      id: "conversation-1",
      title: "Explaining Eigenvectors",
      titleStatus: "generated",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      lastMessageAt: NOW.toISOString(),
    });
  });

  it("extracts visible text from text parts and skips reasoning", () => {
    expect(
      textOf({
        id: "msg",
        role: "assistant",
        parts: [
          { type: "text", text: "Hello " },
          { type: "reasoning", text: "hidden" },
          { type: "text", text: "world" },
        ],
      } as UIMessage)
    ).toBe("Hello world");
  });

  it("validates and merges UI messages", () => {
    expect(isUIMessage(userMessage)).toBe(true);
    expect(isUIMessage({ id: "msg" })).toBe(false);
    expect(mergeIncomingMessage([userMessage], assistantMessage)).toEqual([
      userMessage,
      assistantMessage,
    ]);

    const updated = { ...userMessage, parts: [{ type: "text", text: "New" }] };
    expect(mergeIncomingMessage([userMessage], updated as UIMessage)).toEqual([
      updated,
    ]);
  });
});

describe("conversation service", () => {
  it("creates pending conversations", async () => {
    const created = await createConversation("user-1");

    expect(created).toMatchObject({
      title: "Untitled video",
      titleStatus: "pending",
      lastMessageAt: null,
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", titleStatus: "pending" })
    );
  });

  it("lists conversations with the default page and total count", async () => {
    mockFindMany.mockResolvedValue([row()]);
    mockCount.mockResolvedValue(1);

    await expect(listConversations({ userId: "user-1" })).resolves.toEqual({
      conversations: [serializeConversation(row())],
      total: 1,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 30, offset: 0 })
    );
  });

  it("applies limit and offset for a later page", async () => {
    const second = row({ id: "conversation-2" });
    mockFindMany.mockResolvedValue([second]);
    mockCount.mockResolvedValue(5);

    await expect(
      listConversations({ userId: "user-1", limit: 1, offset: 1 })
    ).resolves.toEqual({
      conversations: [serializeConversation(second)],
      total: 5,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1, offset: 1 })
    );
  });

  it("searches conversations with a sql filter on title and message content", async () => {
    mockFindMany.mockResolvedValue([row()]);
    mockCount.mockResolvedValue(1);

    await expect(
      listConversations({ userId: "user-1", query: " eigen " })
    ).resolves.toEqual({
      conversations: [serializeConversation(row())],
      total: 1,
    });

    // The term is pushed into SQL (title + a message text_content subquery)
    // rather than scanned in memory, and the same filter feeds the count.
    expect(ilike).toHaveBeenCalledWith("conversation.title", "%eigen%");
    expect(ilike).toHaveBeenCalledWith(
      "conversation_message.text_content",
      "%eigen%"
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 30, offset: 0 })
    );
  });

  it("loads owned conversations with ordered UI messages", async () => {
    mockFindFirst.mockResolvedValue({
      ...row(),
      messages: [{ uiMessage: userMessage }, { uiMessage: assistantMessage }],
    });

    await expect(
      loadOwnedConversation({
        conversationId: "conversation-1",
        userId: "user-1",
      })
    ).resolves.toEqual({
      conversation: expect.objectContaining({ id: "conversation-1" }),
      messages: [userMessage, assistantMessage],
    });
  });

  it("returns null when an owned conversation is missing", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      loadOwnedConversation({
        conversationId: "missing",
        userId: "user-1",
      })
    ).resolves.toBeNull();
  });

  it("saves a full message snapshot transactionally", async () => {
    await saveConversationMessages({
      conversationId: "conversation-1",
      messages: [userMessage, assistantMessage],
    });

    expect(mockTxDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockTxInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        conversationId: "conversation-1",
        messageId: "msg-user",
        position: 0,
        role: "user",
        textContent: "Explain eigenvectors",
      }),
      expect.objectContaining({
        messageId: "msg-assistant",
        position: 1,
        textContent: "Eigenvectors keep direction.",
      }),
    ]);
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("renames conversations and marks title as manual", async () => {
    mockUpdateReturning.mockResolvedValue([
      row({ title: "New title", titleStatus: "manual" }),
    ]);

    await expect(
      renameConversation({
        conversationId: "conversation-1",
        userId: "user-1",
        title: "New title",
      })
    ).resolves.toMatchObject({ title: "New title", titleStatus: "manual" });
  });

  it("returns null when rename finds no row", async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await expect(
      renameConversation({
        conversationId: "missing",
        userId: "user-1",
        title: "New title",
      })
    ).resolves.toBeNull();
  });

  it("returns whether delete removed a row", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "conversation-1" }]);
    await expect(
      deleteConversation({ conversationId: "conversation-1", userId: "user-1" })
    ).resolves.toBe(true);

    mockDeleteReturning.mockResolvedValueOnce([]);
    await expect(
      deleteConversation({ conversationId: "missing", userId: "user-1" })
    ).resolves.toBe(false);
  });
});
