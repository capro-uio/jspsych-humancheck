import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });

// jsdom's Performance recurses if installed as the global, so Node's native one is left in place.
for (const key of ["window", "document", "screen"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true });
}
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
