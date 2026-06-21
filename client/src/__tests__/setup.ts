import "@testing-library/jest-dom";

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
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
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
