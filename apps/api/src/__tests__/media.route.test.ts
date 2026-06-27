import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mediaKeyConversationId, signMediaUrl, userOwnsConversation } =
  vi.hoisted(() => ({
    mediaKeyConversationId: vi.fn(),
    signMediaUrl: vi.fn(),
    userOwnsConversation: vi.fn(),
  }));

vi.mock("../lib/media.ts", () => ({ mediaKeyConversationId, signMediaUrl }));
vi.mock("../services/conversations.ts", () => ({ userOwnsConversation }));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { mediaRoute } = await import("../routes/media.ts");

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
  mediaKeyConversationId.mockReset();
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
