import { describe, expect, it } from "vitest";
import {
  CreateShareInputSchema,
  PublicShareResponseSchema,
  VideoKeySchema,
} from "../share.ts";

describe("VideoKeySchema", () => {
  it("accepts a well-formed video key", () => {
    expect(
      VideoKeySchema.safeParse("videos/conv1/Scene-ab12cd34.mp4").success
    ).toBe(true);
  });

  it("rejects malformed keys and traversal", () => {
    for (const bad of [
      "videos/conv1/scene.txt",
      "../../etc/passwd",
      "videos/conv1/../x.mp4",
      "music/track.mp3",
      "",
    ]) {
      expect(VideoKeySchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("CreateShareInputSchema", () => {
  it("requires a valid videoKey", () => {
    expect(
      CreateShareInputSchema.safeParse({
        videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      }).success
    ).toBe(true);
    expect(CreateShareInputSchema.safeParse({ videoKey: "bad" }).success).toBe(
      false
    );
  });
});

describe("PublicShareResponseSchema", () => {
  it("requires a title and both URLs", () => {
    expect(
      PublicShareResponseSchema.safeParse({
        title: "My explainer",
        videoUrl: "https://signed/play",
        downloadUrl: "https://signed/download",
      }).success
    ).toBe(true);
    expect(
      PublicShareResponseSchema.safeParse({
        title: "My explainer",
        videoUrl: "not-a-url",
        downloadUrl: "https://signed/download",
      }).success
    ).toBe(false);
  });
});
