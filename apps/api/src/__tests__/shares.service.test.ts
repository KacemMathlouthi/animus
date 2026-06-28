import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindFirst, mockOnConflict, mockValues, mockInsert } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockOnConflict: vi.fn(),
    mockValues: vi.fn(),
    mockInsert: vi.fn(),
  })
);

vi.mock("@animus/db", () => ({
  db: {
    insert: mockInsert,
    query: { videoShare: { findFirst: mockFindFirst } },
  },
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  videoShare: {
    token: "video_share.token",
    videoKey: "video_share.video_key",
  },
}));

const { createShare, getShareByToken } = await import("../services/shares.ts");

const MISSING_ROW_ERROR = /missing/;

beforeEach(() => {
  mockFindFirst.mockReset();
  mockOnConflict.mockReset();
  mockValues.mockReset();
  mockInsert.mockReset();
  mockOnConflict.mockResolvedValue(undefined);
  mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflict });
  mockInsert.mockReturnValue({ values: mockValues });
});

describe("createShare", () => {
  it("inserts (ignoring conflicts) then reads back the surviving token", async () => {
    mockFindFirst.mockResolvedValue({ token: "tok123" });

    const result = await createShare({
      conversationId: "conv1",
      userId: "u1",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });

    expect(result).toEqual({ token: "tok123" });
    // The insert ignores a conflict on the videoKey unique index (idempotent).
    expect(mockOnConflict).toHaveBeenCalledWith({
      target: "video_share.video_key",
    });
    const inserted = mockValues.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      conversationId: "conv1",
      userId: "u1",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });
    expect(typeof inserted.token).toBe("string");
  });

  it("throws if the row is missing after insert", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    await expect(
      createShare({
        conversationId: "conv1",
        userId: "u1",
        videoKey: "videos/conv1/Scene-ab12cd34.mp4",
        title: "x",
      })
    ).rejects.toThrow(MISSING_ROW_ERROR);
  });
});

describe("getShareByToken", () => {
  it("returns the row when found", async () => {
    const row = { token: "tok123", videoKey: "videos/conv1/x.mp4" };
    mockFindFirst.mockResolvedValue(row);

    expect(await getShareByToken("tok123")).toBe(row);
  });

  it("returns null when not found", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    expect(await getShareByToken("nope")).toBeNull();
  });
});
