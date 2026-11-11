// pnpm lint:content [dir] — editorial lint over content/.
// pnpm lint:content --staged — lint content/ as it is about to be committed
// (the git index), ignoring uncommitted drafts in the working tree.
// Exits 1 when there is at least one error; warnings alone exit 0.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { lintContent } from "./lib/content-lint.ts";

const staged = process.argv.includes("--staged");
const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
const root = resolve(dir ?? "content");
const files: Record<string, string> = {};

if (staged) {
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  const prefix = `${relative(git("rev-parse", "--show-toplevel").trim(), root)}/`;
  for (const path of git("ls-files", "-z", "--", prefix)
    .split("\0")
    .filter(Boolean)) {
    if (/\.(md|yaml)$/.test(path))
      files[path.slice(prefix.length)] = git("show", `:${path}`);
  }
} else if (existsSync(root)) {
  for (const entry of readdirSync(root, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !/\.(md|yaml)$/.test(entry.name)) continue;
    const full = join(entry.parentPath, entry.name);
    files[relative(root, full)] = readFileSync(full, "utf8");
  }
} else if (dir) {
  // A missing content/ is an empty archive (a fresh clone); a directory named
  // on the command line must exist.
  console.error(`${dir}: no such directory`);
  process.exit(1);
}

const issues = lintContent(files);
for (const i of issues) {
  const where = `${relative(process.cwd(), join(root, i.path))}${i.line ? `:${i.line}` : ""}`;
  console.log(`${where}  ${i.severity} ${i.rule}  ${i.message}`);
}
const errors = issues.filter((i) => i.severity === "error").length;
const warnings = issues.length - errors;
console.log(
  `${Object.keys(files).length} files, ${errors} errors, ${warnings} warnings`,
);
process.exit(errors > 0 ? 1 : 0);
