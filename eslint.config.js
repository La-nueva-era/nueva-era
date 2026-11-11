import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

// Paths excluded only in this clone (its info/exclude) are not linted either.
// Asking git for the path also works in a worktree, where .git is a file.
const excludeFile = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--git-path", "info/exclude"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
})();
const localExcludes =
  excludeFile && existsSync(excludeFile)
    ? readFileSync(excludeFile, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    : [];

export default tseslint.config(
  {
    ignores: ["**/dist/", "**/.astro/", "node_modules/", ...localExcludes],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
);
