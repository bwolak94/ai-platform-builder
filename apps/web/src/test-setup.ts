import "@testing-library/jest-dom";

// ResizeObserver is not implemented in jsdom — provide a no-op stub so
// components that rely on it (e.g. Radix ScrollArea) don't throw.
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};
