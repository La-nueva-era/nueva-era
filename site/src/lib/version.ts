// Edition version for pack headers (SPEC §9.5): the latest CalVer git tag and
// the commit. Read once at build time.
import { execFileSync } from "node:child_process";

function git(args: string[]): string | undefined {
  try {
    return (
      execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

export const edition = {
  /** Latest tag reachable from HEAD, e.g. "2026.11"; undefined before the first release. */
  version: git(["describe", "--tags", "--abbrev=0"]),
  commit:
    git(["rev-parse", "--short", "HEAD"]) ??
    process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ??
    "unknown",
  date: new Date().toISOString().slice(0, 10),
};
