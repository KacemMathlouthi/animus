/** Global test setup for the web app: jest-dom matchers, RTL teardown, and
 * stubs for the browser APIs jsdom doesn't implement but our components call
 * unconditionally (IntersectionObserver, ResizeObserver, matchMedia,
 * scrollIntoView). Without these, rendering anything from the studio throws
 * before a single assertion runs. */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class NoopObserver {
  observe(): void {
    // no-op: tests that care drive the callback themselves
  }
  unobserve(): void {
    // no-op
  }
  disconnect(): void {
    // no-op
  }
  takeRecords(): [] {
    return [];
  }
}

if (!("IntersectionObserver" in globalThis)) {
  vi.stubGlobal("IntersectionObserver", NoopObserver);
}
if (!("ResizeObserver" in globalThis)) {
  vi.stubGlobal("ResizeObserver", NoopObserver);
}

// jsdom ships neither of these; shadcn's sidebar/tooltip and the chat
// autoscroll call them during render.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {
        // deprecated API, unused
      },
      removeListener: () => {
        // deprecated API, unused
      },
      addEventListener: () => {
        // no-op
      },
      removeEventListener: () => {
        // no-op
      },
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
Element.prototype.scrollIntoView ??= () => {
  // no-op
};

// jsdom's getContext throws "not implemented" rather than returning null, which
// the video player's ambient-glow canvas already handles. Returning null takes
// that supported path instead of filling the run with stderr noise.
HTMLCanvasElement.prototype.getContext = () => null;

/** Node exposes a `localStorage` global that is an empty object unless started
 * with `--localstorage-file`, and it shadows jsdom's. Every method the app calls
 * would throw, which `pending-prompt` swallows — so the feature would look fine
 * and test as a no-op. This is a real Storage backed by a Map. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

vi.stubGlobal("localStorage", memoryStorage());
vi.stubGlobal("sessionStorage", memoryStorage());

afterEach(() => {
  cleanup();
});
