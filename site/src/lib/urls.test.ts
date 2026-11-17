import { describe, expect, it } from "vitest";
import { pagePath } from "./urls.ts";

describe("pagePath", () => {
  it.each([
    ["/index.html", "/"],
    ["/", "/"],
    ["/solitario.html", "/solitario"],
    ["/solitario", "/solitario"],
    ["/solitario/una-parte-de-mi.html", "/solitario/una-parte-de-mi"],
    ["/indice/titulos.html", "/indice/titulos"],
  ])("%s → %s", (pathname, path) => {
    expect(pagePath(pathname)).toBe(path);
  });
});
