// pnpm import:youtube [author] [url ...] — draft stubs for new videos (SPEC §13).
//
// With no arguments, imports every author whose content/authors/<id>.yaml has
// links.youtube. With an author and URLs, imports those channels or playlists
// for that author. Requires yt-dlp on PATH.
//
// Never modifies an existing file: videos whose id is already in content/ are
// skipped, and a stub whose path already exists is reported and not written.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { existingVideoIds, stubFor, type Video } from "./lib/youtube-import.ts";

const CONTENT = "content";

function ytdlp(args: string[]): string {
  return execFileSync(
    "yt-dlp",
    ["--ignore-errors", "--skip-download", ...args],
    {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
}

type AuthorFile = { id: string; name: string; links?: { youtube?: string } };

function readAuthor(id: string): AuthorFile {
  return parseYaml(
    readFileSync(join(CONTENT, "authors", `${id}.yaml`), "utf8"),
  ) as AuthorFile;
}

function sources(): { author: AuthorFile; urls: string[] }[] {
  const [id, ...urls] = process.argv.slice(2);
  if (id) {
    const author = readAuthor(id);
    if (urls.length > 0) return [{ author, urls }];
    if (!author.links?.youtube) {
      throw new Error(
        `content/authors/${id}.yaml has no links.youtube; pass a URL`,
      );
    }
    return [{ author, urls: [author.links.youtube] }];
  }
  return readdirSync(join(CONTENT, "authors"))
    .filter((f) => f.endsWith(".yaml") && !f.startsWith("_"))
    .map((f) => readAuthor(f.replace(/\.yaml$/, "")))
    .flatMap((author) =>
      author.links?.youtube ? [{ author, urls: [author.links.youtube] }] : [],
    );
}

const works: Record<string, string> = {};
for (const dir of readdirSync(CONTENT, { withFileTypes: true })) {
  if (
    !dir.isDirectory() ||
    ["authors", "collections", "tags"].includes(dir.name)
  )
    continue;
  for (const f of readdirSync(join(CONTENT, dir.name))) {
    if (f.endsWith(".md"))
      works[`${dir.name}/${f}`] = readFileSync(
        join(CONTENT, dir.name, f),
        "utf8",
      );
  }
}
const known = existingVideoIds(works);

let written = 0;
let skipped = 0;
for (const { author, urls } of sources()) {
  for (const url of urls) {
    const listed = ytdlp(["--flat-playlist", "--print", "id", url])
      .split("\n")
      .filter(Boolean);
    const fresh = listed.filter((id) => !known.has(id));
    console.log(
      `${author.id} · ${url}: ${listed.length} videos, ${fresh.length} new`,
    );
    for (const id of fresh) {
      let json = "";
      try {
        json = ytdlp(["-j", `https://www.youtube.com/watch?v=${id}`]).trim();
      } catch {
        // yt-dlp already printed why (age-restricted, private, members only…).
      }
      if (!json) {
        console.log(`  skip ${id}: yt-dlp could not fetch its metadata`);
        skipped++;
        continue;
      }
      const v = JSON.parse(json) as Video;
      const stub = stubFor(
        {
          id: v.id,
          title: v.title,
          upload_date: v.upload_date,
          description: v.description ?? "",
        },
        author,
      );
      const path = join(CONTENT, stub.path);
      if (existsSync(path)) {
        console.log(`  skip ${id}: ${path} already exists`);
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, stub.text, { flag: "wx" });
      known.add(id);
      written++;
      console.log(`  new  ${path}  (${v.title})`);
    }
  }
}
console.log(`${written} draft stubs written, ${skipped} videos skipped`);
process.exit(skipped > 0 ? 1 : 0);
