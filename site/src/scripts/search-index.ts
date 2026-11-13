// Loads the search index once, on demand (never on page load).
import type { Loaded } from "../lib/search.ts";

let loading: Promise<Loaded> | undefined;

export function getIndex(): Promise<Loaded> {
  loading ??= Promise.all([
    import("../lib/search.ts"),
    fetch("/search/index.json").then((r) => r.text()),
  ]).then(([search, json]) => search.loadIndex(json));
  return loading;
}
