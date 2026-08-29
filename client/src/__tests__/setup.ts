import "@testing-library/jest-dom";

// jsdom does not implement scrollIntoView. Components that keep the active
// option of a listbox in view call it directly, so stub it out.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Vitest v4+ with jsdom may wrap localStorage in a file-based proxy that
// lacks the full Storage API (e.g., .clear()). Restore a proper mock.
const createMockStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      const { [key]: _removed, ...rest } = store;
      store = rest;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
  };
};

const mockStorage = createMockStorage();
Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: false,
  configurable: true,
});
