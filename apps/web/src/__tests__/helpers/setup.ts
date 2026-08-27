/** jest-dom matchers, RTL teardown, and stubs for the browser APIs jsdom lacks
 * but our components call unconditionally. Without them, rendering anything
 * from the studio throws before a single assertion runs. */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class NoopObserver {
  observe(): void {
    // Tests that care drive the callback themselves.
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

// jsdom ships neither; the sidebar, tooltip and chat autoscroll call them.
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

// jsdom's getContext throws instead of returning null, which the ambient-glow
// canvas already handles. Null takes that path and spares the stderr noise.
HTMLCanvasElement.prototype.getContext = () => null;

/** Node's `localStorage` global is an empty object that shadows jsdom's, so
 * every call throws and `pending-prompt` swallows it: the feature would test as
 * a silent no-op. This is a real Storage backed by a Map. */
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
