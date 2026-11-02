// pnpm lint:content [dir] — editorial lint over content/ (SPEC §6.4).
// Exits 1 when there is at least one error; warnings alone exit 0.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { lintContent } from "./lib/content-lint.ts";

const root = resolve(process.argv[2] ?? "content");
const files: Record<string, string> = {};
for (const entry of readdirSync(root, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile() || !/\.(md|yaml)$/.test(entry.name)) continue;
  const full = join(entry.parentPath, entry.name);
  files[relative(root, full)] = readFileSync(full, "utf8");
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
