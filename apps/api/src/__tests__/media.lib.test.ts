import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, getSignedUrl } = vi.hoisted(() => ({
  send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({
    r2AccountId: "acct",
    r2AccessKeyId: "akid",
    r2SecretAccessKey: "secret",
    r2Bucket: "animus-videos",
  }),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class FakeCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    S3Client: class {
      send = send;
    },
    PutObjectCommand: class extends FakeCommand {},
    GetObjectCommand: class extends FakeCommand {},
    ListObjectsV2Command: class extends FakeCommand {},
    DeleteObjectsCommand: class extends FakeCommand {},
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl }));

const {
  backgroundMusicUrl,
  deleteConversationMedia,
  mediaKeyConversationId,
  saveVideo,
  signDownloadUrl,
  signMediaUrl,
} = await import("../lib/media.ts");

const KEY_SHAPE = /^videos\/conv1\/Scene-[a-f0-9]{8}\.mp4$/;

beforeEach(() => {
  send.mockReset();
  getSignedUrl.mockReset();
});

describe("saveVideo", () => {
  it("uploads to a conversation-scoped, unique mp4 key and returns it", async () => {
    send.mockResolvedValue({});
    const key = await saveVideo({
      bytes: new Uint8Array([1, 2, 3]),
      conversationId: "conv1",
      scene: "Scene",
    });

    expect(key).toMatch(KEY_SHAPE);
    const command = send.mock.calls[0]?.[0];
    expect(command.input).toMatchObject({
      Bucket: "animus-videos",
      Key: key,
      ContentType: "video/mp4",
    });
  });

  it("sanitizes unsafe characters in the conversation id and scene", async () => {
    send.mockResolvedValue({});
    const key = await saveVideo({
      bytes: new Uint8Array(),
      conversationId: "../evil",
      scene: "a/b c",
    });
    // No traversal or spaces survive into the key (../ -> ___).
    expect(key.startsWith("videos/___evil/")).toBe(true);
    expect(key).not.toContain("..");
    expect(key).not.toContain(" ");
  });
});

describe("mediaKeyConversationId", () => {
  it("extracts the conversation id from a well-formed key", () => {
    expect(mediaKeyConversationId("videos/conv1/Scene-ab12cd34.mp4")).toBe(
      "conv1"
    );
  });

  it("rejects malformed keys and traversal", () => {
    expect(mediaKeyConversationId("videos/conv1/scene.txt")).toBeNull();
    expect(mediaKeyConversationId("../../etc/passwd")).toBeNull();
    expect(mediaKeyConversationId("videos/conv1/../x.mp4")).toBeNull();
  });
});

describe("backgroundMusicUrl", () => {
  it("presigns a GET for the fixed background music key", async () => {
    getSignedUrl.mockResolvedValue("https://signed/music");

    const url = await backgroundMusicUrl();

    expect(url).toBe("https://signed/music");
    const command = getSignedUrl.mock.calls[0]?.[1];
    expect(command.input).toMatchObject({
      Bucket: "animus-videos",
      Key: "music/The_Merchants_Of_Death.mp3",
    });
  });
});

describe("signMediaUrl", () => {
  it("delegates to getSignedUrl for the key", async () => {
    getSignedUrl.mockResolvedValue("https://signed/url");
    const url = await signMediaUrl("videos/conv1/Scene-ab12cd34.mp4");

    expect(url).toBe("https://signed/url");
    const command = getSignedUrl.mock.calls[0]?.[1];
    expect(command.input).toMatchObject({
      Bucket: "animus-videos",
      Key: "videos/conv1/Scene-ab12cd34.mp4",
    });
  });
});

describe("signDownloadUrl", () => {
  it("presigns a GET with an attachment disposition and a safe filename", async () => {
    getSignedUrl.mockResolvedValue("https://signed/download");
    const url = await signDownloadUrl(
      "videos/conv1/Scene-ab12cd34.mp4",
      "My Title!"
    );

    expect(url).toBe("https://signed/download");
    const command = getSignedUrl.mock.calls[0]?.[1];
    expect(command.input).toMatchObject({
      Bucket: "animus-videos",
      Key: "videos/conv1/Scene-ab12cd34.mp4",
      // Unsafe chars are replaced and the .mp4 extension is appended.
      ResponseContentDisposition: 'attachment; filename="My_Title_.mp4"',
    });
  });
});

describe("deleteConversationMedia", () => {
  it("lists by prefix and deletes the found objects", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [
          { Key: "videos/conv1/a.mp4" },
          { Key: "videos/conv1/b.mp4" },
        ],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    await deleteConversationMedia("conv1");

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: "animus-videos",
      Prefix: "videos/conv1/",
    });
    expect(send.mock.calls[1]?.[0].input.Delete.Objects).toEqual([
      { Key: "videos/conv1/a.mp4" },
      { Key: "videos/conv1/b.mp4" },
    ]);
  });

  it("paginates through truncated listings", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: "videos/conv1/a.mp4" }],
        IsTruncated: true,
        NextContinuationToken: "tok",
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Contents: [{ Key: "videos/conv1/b.mp4" }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    await deleteConversationMedia("conv1");

    expect(send).toHaveBeenCalledTimes(4);
    expect(send.mock.calls[2]?.[0].input.ContinuationToken).toBe("tok");
  });

  it("does not issue a delete when nothing matches", async () => {
    send.mockResolvedValueOnce({ Contents: [], IsTruncated: false });

    await deleteConversationMedia("conv1");

    expect(send).toHaveBeenCalledTimes(1);
  });
});
