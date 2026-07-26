import { describe, expect, it, vi } from "vitest";
import {
  notifyCreditsChanged,
  notifyOutOfCredits,
  onCreditsChanged,
  onOutOfCredits,
} from "@/lib/credit-events";

describe("credit events", () => {
  it("delivers credits-changed to a subscriber", () => {
    const handler = vi.fn();
    const off = onCreditsChanged(handler);

    notifyCreditsChanged();

    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });

  it("delivers out-of-credits to a subscriber", () => {
    const handler = vi.fn();
    const off = onOutOfCredits(handler);

    notifyOutOfCredits();

    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });

  it("keeps the two channels separate", () => {
    const changed = vi.fn();
    const depleted = vi.fn();
    const offChanged = onCreditsChanged(changed);
    const offDepleted = onOutOfCredits(depleted);

    notifyCreditsChanged();

    expect(changed).toHaveBeenCalledTimes(1);
    expect(depleted).not.toHaveBeenCalled();
    offChanged();
    offDepleted();
  });

  it("stops delivering once unsubscribed", () => {
    const handler = vi.fn();
    onCreditsChanged(handler)();

    notifyCreditsChanged();

    expect(handler).not.toHaveBeenCalled();
  });

  it("fans out to every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = onCreditsChanged(first);
    const offSecond = onCreditsChanged(second);

    notifyCreditsChanged();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    offFirst();
    offSecond();
  });
});
