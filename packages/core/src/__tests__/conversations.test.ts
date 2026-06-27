import { describe, expect, it } from "vitest";
import {
  CONVERSATION_TITLE_STATUSES,
  ConversationListResponseSchema,
  ConversationSummarySchema,
  ConversationTitleStatusSchema,
  CreateConversationResponseSchema,
  GeneratedConversationTitleSchema,
  RenameConversationInputSchema,
} from "../conversations.ts";

const validSummary = {
  id: "conv1",
  title: "My conversation",
  titleStatus: "generated" as const,
  createdAt: "2026-06-27T00:00:00.000Z",
  updatedAt: "2026-06-27T00:00:00.000Z",
  lastMessageAt: "2026-06-27T00:00:00.000Z",
};

describe("ConversationTitleStatusSchema", () => {
  it("exposes the expected status set", () => {
    expect(CONVERSATION_TITLE_STATUSES).toEqual([
      "pending",
      "generated",
      "manual",
    ]);
  });

  it("accepts every known status", () => {
    for (const status of CONVERSATION_TITLE_STATUSES) {
      expect(ConversationTitleStatusSchema.safeParse(status).success).toBe(
        true
      );
    }
  });

  it("rejects an unknown status", () => {
    expect(ConversationTitleStatusSchema.safeParse("archived").success).toBe(
      false
    );
  });

  it("rejects a non-string status", () => {
    expect(ConversationTitleStatusSchema.safeParse(1).success).toBe(false);
  });
});

describe("ConversationSummarySchema", () => {
  it("accepts a well-formed summary", () => {
    expect(ConversationSummarySchema.safeParse(validSummary).success).toBe(
      true
    );
  });

  it("accepts a null lastMessageAt", () => {
    expect(
      ConversationSummarySchema.safeParse({
        ...validSummary,
        lastMessageAt: null,
      }).success
    ).toBe(true);
  });

  it("rejects an empty id", () => {
    expect(
      ConversationSummarySchema.safeParse({ ...validSummary, id: "" }).success
    ).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(
      ConversationSummarySchema.safeParse({ ...validSummary, title: "" })
        .success
    ).toBe(false);
  });

  it("rejects an invalid titleStatus", () => {
    expect(
      ConversationSummarySchema.safeParse({
        ...validSummary,
        titleStatus: "nope",
      }).success
    ).toBe(false);
  });

  it("rejects a non-string createdAt", () => {
    expect(
      ConversationSummarySchema.safeParse({ ...validSummary, createdAt: 123 })
        .success
    ).toBe(false);
  });

  it("rejects an undefined lastMessageAt (must be string or null)", () => {
    const { lastMessageAt, ...partial } = validSummary;
    expect(ConversationSummarySchema.safeParse(partial).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const { id, ...partial } = validSummary;
    expect(ConversationSummarySchema.safeParse(partial).success).toBe(false);
  });
});

describe("ConversationListResponseSchema", () => {
  it("accepts a populated list", () => {
    expect(
      ConversationListResponseSchema.safeParse({
        conversations: [validSummary],
        total: 1,
      }).success
    ).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(
      ConversationListResponseSchema.safeParse({
        conversations: [],
        total: 0,
      }).success
    ).toBe(true);
  });

  it("rejects a negative total", () => {
    expect(
      ConversationListResponseSchema.safeParse({
        conversations: [],
        total: -1,
      }).success
    ).toBe(false);
  });

  it("rejects a non-integer total", () => {
    expect(
      ConversationListResponseSchema.safeParse({
        conversations: [],
        total: 1.5,
      }).success
    ).toBe(false);
  });

  it("rejects an invalid conversation in the array", () => {
    expect(
      ConversationListResponseSchema.safeParse({
        conversations: [{ ...validSummary, id: "" }],
        total: 1,
      }).success
    ).toBe(false);
  });

  it("rejects a missing total", () => {
    expect(
      ConversationListResponseSchema.safeParse({ conversations: [] }).success
    ).toBe(false);
  });
});

describe("RenameConversationInputSchema", () => {
  it("accepts a valid title", () => {
    expect(
      RenameConversationInputSchema.safeParse({ title: "New name" }).success
    ).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = RenameConversationInputSchema.safeParse({
      title: "  spaced  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("spaced");
    }
  });

  it("rejects an empty title", () => {
    expect(RenameConversationInputSchema.safeParse({ title: "" }).success).toBe(
      false
    );
  });

  it("rejects a whitespace-only title (after trim)", () => {
    expect(
      RenameConversationInputSchema.safeParse({ title: "   " }).success
    ).toBe(false);
  });

  it("accepts a title at the 120-char maximum", () => {
    expect(
      RenameConversationInputSchema.safeParse({ title: "a".repeat(120) })
        .success
    ).toBe(true);
  });

  it("rejects a title over 120 chars", () => {
    expect(
      RenameConversationInputSchema.safeParse({ title: "a".repeat(121) })
        .success
    ).toBe(false);
  });

  it("rejects a non-string title", () => {
    expect(RenameConversationInputSchema.safeParse({ title: 5 }).success).toBe(
      false
    );
  });

  it("rejects a missing title", () => {
    expect(RenameConversationInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("CreateConversationResponseSchema", () => {
  it("accepts a wrapped summary", () => {
    expect(
      CreateConversationResponseSchema.safeParse({
        conversation: validSummary,
      }).success
    ).toBe(true);
  });

  it("rejects an invalid nested summary", () => {
    expect(
      CreateConversationResponseSchema.safeParse({
        conversation: { ...validSummary, titleStatus: "bad" },
      }).success
    ).toBe(false);
  });

  it("rejects a missing conversation", () => {
    expect(CreateConversationResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("GeneratedConversationTitleSchema", () => {
  it("accepts a valid title", () => {
    expect(
      GeneratedConversationTitleSchema.safeParse({ title: "Vectors 101" })
        .success
    ).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(
      GeneratedConversationTitleSchema.safeParse({ title: "" }).success
    ).toBe(false);
  });

  it("accepts a title at the 80-char maximum", () => {
    expect(
      GeneratedConversationTitleSchema.safeParse({ title: "a".repeat(80) })
        .success
    ).toBe(true);
  });

  it("rejects a title over 80 chars", () => {
    expect(
      GeneratedConversationTitleSchema.safeParse({ title: "a".repeat(81) })
        .success
    ).toBe(false);
  });

  it("rejects a missing title", () => {
    expect(GeneratedConversationTitleSchema.safeParse({}).success).toBe(false);
  });
});
