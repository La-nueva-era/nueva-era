import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["site/src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Vitest replaces CSS imports with an empty module unless they are
    // included here; the share images read their colours from tokens.css.
    css: { include: [/\/styles\/tokens\.css/] },
  },
});
