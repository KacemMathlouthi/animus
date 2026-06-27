import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createShare,
  mediaKeyConversationId,
  ownedConversationTitle,
  signDownloadUrl,
  signMediaUrl,
  userOwnsConversation,
} = vi.hoisted(() => ({
  createShare: vi.fn(),
  mediaKeyConversationId: vi.fn(),
  ownedConversationTitle: vi.fn(),
  signDownloadUrl: vi.fn(),
  signMediaUrl: vi.fn(),
  userOwnsConversation: vi.fn(),
}));

vi.mock("../lib/media.ts", () => ({
  mediaKeyConversationId,
  signDownloadUrl,
  signMediaUrl,
}));
vi.mock("../services/conversations.ts", () => ({
  ownedConversationTitle,
  userOwnsConversation,
}));
vi.mock("../services/shares.ts", () => ({ createShare }));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { mediaRoute } = await import("../routes/media.ts");

const VALID_KEY = "videos/conv1/Scene-ab12cd34.mp4";

type TestUser = { id: string } | null;

function appWith(user: TestUser) {
  const app = new Hono<{ Variables: { user: TestUser } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/media", mediaRoute);
  return app;
}

beforeEach(() => {
  createShare.mockReset();
  mediaKeyConversationId.mockReset();
  ownedConversationTitle.mockReset();
  signDownloadUrl.mockReset();
  signMediaUrl.mockReset();
  userOwnsConversation.mockReset();
});

describe("GET /media/sign", () => {
  it("400s when the key is missing or malformed", async () => {
    mediaKeyConversationId.mockReturnValue(null);
    const res = await appWith({ id: "u1" }).request("/media/sign?key=bad");

    expect(res.status).toBe(400);
    expect(signMediaUrl).not.toHaveBeenCalled();
  });

  it("404s when the caller does not own the conversation", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    userOwnsConversation.mockResolvedValue(false);

    const res = await appWith({ id: "u1" }).request(
      "/media/sign?key=videos/conv1/Scene-ab12cd34.mp4"
    );

    expect(res.status).toBe(404);
    expect(signMediaUrl).not.toHaveBeenCalled();
  });

  it("returns a presigned url for an owned conversation", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    userOwnsConversation.mockResolvedValue(true);
    signMediaUrl.mockResolvedValue("https://signed/url");

    const res = await appWith({ id: "u1" }).request(
      "/media/sign?key=videos/conv1/Scene-ab12cd34.mp4"
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://signed/url" });
    expect(userOwnsConversation).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
    });
  });
});

describe("GET /media/download", () => {
  it("404s when the caller does not own the conversation", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    userOwnsConversation.mockResolvedValue(false);

    const res = await appWith({ id: "u1" }).request(
      `/media/download?key=${VALID_KEY}`
    );

    expect(res.status).toBe(404);
    expect(signDownloadUrl).not.toHaveBeenCalled();
  });

  it("returns an attachment presign with the requested filename", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    userOwnsConversation.mockResolvedValue(true);
    signDownloadUrl.mockResolvedValue("https://signed/download");

    const res = await appWith({ id: "u1" }).request(
      `/media/download?key=${VALID_KEY}&filename=My+Video`
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://signed/download" });
    expect(signDownloadUrl).toHaveBeenCalledWith(VALID_KEY, "My Video");
  });
});

describe("POST /media/share", () => {
  function postShare(user: TestUser, body: unknown) {
    return appWith(user).request("/media/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("400s when the videoKey is malformed", async () => {
    const res = await postShare({ id: "u1" }, { videoKey: "nope" });

    expect(res.status).toBe(400);
    expect(createShare).not.toHaveBeenCalled();
  });

  it("404s when the caller does not own the conversation", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    ownedConversationTitle.mockResolvedValue(null);

    const res = await postShare({ id: "u1" }, { videoKey: VALID_KEY });

    expect(res.status).toBe(404);
    expect(createShare).not.toHaveBeenCalled();
  });

  it("creates a share and returns its token", async () => {
    mediaKeyConversationId.mockReturnValue("conv1");
    ownedConversationTitle.mockResolvedValue("My explainer");
    createShare.mockResolvedValue({ token: "tok123" });

    const res = await postShare({ id: "u1" }, { videoKey: VALID_KEY });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "tok123" });
    expect(createShare).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
      videoKey: VALID_KEY,
      title: "My explainer",
    });
  });
});
