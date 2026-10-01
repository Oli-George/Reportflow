import "@testing-library/jest-dom"
import "fake-indexeddb/auto"
import { beforeEach } from "vitest"

// Polyfill window.matchMedia for JSDOM
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Polyfill crypto.randomUUID if not present
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  // @ts-ignore
  crypto.randomUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

// Clear mock localStorage before each test
beforeEach(() => {
  if (typeof localStorage !== "undefined") {
    localStorage.clear()
  }
})
