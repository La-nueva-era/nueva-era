// Editorial lint over content/.
// Pure: takes { "<path relative to content/>": text } and returns issues.
// Every rule is an error, drafts included, except an uncertain reading in a
// reviewed work, which is a warning.

import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import { ParseError, parseBody } from "../../site/src/lib/parse.ts";

const VOICES = ["A", "B", "C"];
import {
  authorSchema,
  collectionSchema,
  tagSchema,
  workSchema,
  type WorkMeta,
} from "../../site/src/lib/schema.ts";

export type Issue = {
  path: string;
  line?: number;
  rule: string;
  severity: "error" | "warning";
  message: string;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_DIRS = {
  authors: authorSchema,
  collections: collectionSchema,
  tags: tagSchema,
};

type Work = { path: string; id: string; meta: WorkMeta };

export function lintContent(files: Record<string, string>): Issue[] {
  const issues: Issue[] = [];
  const report = (path: string, rule: string, message: string, line?: number) =>
    issues.push({
      path,
      rule,
      severity: "error",
      message,
      ...(line === undefined ? {} : { line }),
    });

  const ids = {
    authors: new Set<string>(),
    collections: new Map<string, boolean>(),
    tags: new Map<string, boolean>(),
  };
  const owners: { path: string; author: string }[] = [];
  const works: Work[] = [];

  const paths = Object.keys(files)
    .filter((p) => !(p.split("/").at(-1) ?? "").startsWith("_"))
    .sort();

  // Authors, collections and tags.
  for (const path of paths) {
    const [dir, file] = path.split("/");
    if (!(dir && file && dir in DATA_DIRS && file.endsWith(".yaml"))) continue;
    const data = readYaml(files[path] ?? "", (m) => report(path, "yaml", m));
    if (data === undefined) continue;
    const schema: z.ZodType = DATA_DIRS[dir as keyof typeof DATA_DIRS];
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const m of zodMessages(result.error)) report(path, "schema", m);
      continue;
    }
    const value = result.data as {
      id: string;
      author?: string;
      ordered?: boolean;
    };
    if (value.id !== file.replace(/\.yaml$/, "")) {
      report(
        path,
        "id-filename",
        `id «${value.id}» does not match the filename`,
      );
    }
    if (dir === "authors") ids.authors.add(value.id);
    if (dir === "collections")
      ids.collections.set(value.id, value.ordered ?? false);
    if (dir === "tags") ids.tags.set(value.id, value.ordered ?? false);
    if (value.author !== undefined) owners.push({ path, author: value.author });
  }
  for (const { path, author } of owners) {
    if (!ids.authors.has(author))
      report(path, "unknown-author", `unknown author «${author}»`);
  }

  // Works.
  for (const path of paths) {
    const [dir, file, ...rest] = path.split("/");
    if (
      !dir ||
      !file ||
      rest.length > 0 ||
      dir in DATA_DIRS ||
      !file.endsWith(".md")
    )
      continue;
    const work = lintWork(
      path,
      dir,
      file.replace(/\.md$/, ""),
      files[path] ?? "",
      ids,
      issues,
    );
    if (work) works.push(work);
  }

  // Across works.
  const seen = new Map<string, string>();
  for (const w of works) {
    const first = seen.get(w.meta.youtube.id);
    if (first) {
      report(
        w.path,
        "duplicate-youtube-id",
        `youtube.id «${w.meta.youtube.id}» already used by ${first}`,
      );
    } else {
      seen.set(w.meta.youtube.id, w.id);
    }
    for (const r of w.meta.related ?? []) {
      if (!works.some((o) => o.id === r))
        report(w.path, "unknown-related", `unknown related work «${r}»`);
    }
  }
  // Ordered collections and ordered tags (tags behave like EPs) share the rule.
  for (const kind of ["collections", "tags"] as const) {
    const noun = kind === "tags" ? "tag" : "collection";
    for (const [id, ordered] of ids[kind]) {
      if (!ordered) continue;
      const members = works.flatMap((w) =>
        (w.meta[kind] ?? [])
          .filter((c) => c.id === id)
          .map((c) => ({ id: w.id, position: c.position })),
      );
      const problem = positionProblem(members, noun);
      if (problem) report(`${kind}/${id}.yaml`, `${noun}-positions`, problem);
    }
  }

  return issues;
}

function lintWork(
  path: string,
  dir: string,
  slug: string,
  text: string,
  ids: {
    authors: Set<string>;
    collections: Map<string, boolean>;
    tags: Map<string, boolean>;
  },
  issues: Issue[],
): Work | undefined {
  const report = (
    rule: string,
    message: string,
    line?: number,
    severity: Issue["severity"] = "error",
  ) =>
    issues.push({
      path,
      rule,
      severity,
      message,
      ...(line === undefined ? {} : { line }),
    });

  if (!SLUG.test(slug))
    report("slug", `slug «${slug}» must be kebab-case ASCII`);

  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!fm) {
    report("front-matter", "missing front matter between «---» lines");
    return undefined;
  }
  const bodyStart = fm[0].split("\n").length; // file line of the body's first line
  const body = text.slice(fm[0].length);

  // Front matter.
  let meta: WorkMeta | undefined;
  const data = readYaml(fm[1] ?? "", (m) => report("yaml", m));
  if (data !== undefined) {
    const raw = stripPatreonText(data, (i) =>
      report(
        "patreon-text",
        `sources[${i}]: a patreon source never carries text`,
      ),
    );
    const result = workSchema.safeParse(raw);
    if (result.success) meta = result.data;
    else for (const m of zodMessages(result.error)) report("schema", m);
  }

  // Body.
  let parsed: ReturnType<typeof parseBody> | undefined;
  try {
    parsed = parseBody(body);
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    report(
      "parse",
      e.message.replace(/^line \d+: /, ""),
      bodyStart + e.line - 1,
    );
  }
  const lines = body.split("\n");
  if (lines.at(-1) === "") lines.pop();
  // Dialog voices: only those with a colour on the site (tokens.css).
  if (parsed)
    lines.forEach((l, i) => {
      const v = /^\[([A-Z])\]$/.exec(l)?.[1];
      if (v && !VOICES.includes(v))
        report(
          "voice",
          `voice «${v}» has no colour; use ${VOICES.join(", ")} or [Narrador]`,
          bodyStart + i,
        );
    });
  lines.forEach((l, i) =>
    typography(l, (rule, m) => report(rule, m, bodyStart + i)),
  );
  balance(lines, (m, i) => report("unbalanced", m, bodyStart + i));
  if (body !== "" && !body.endsWith("\n"))
    report("final-newline", "file must end with a newline");

  if (!meta) return undefined;

  // An imported stub has no text yet; it may exist, but never as a listed work.
  if (meta.visibility === "public" && parsed?.verseCount === 0) {
    report("empty-public", "a public work must have verses");
  }

  // Editor's prose in the front matter: title and notes. Sources are verbatim.
  const prose = (field: string, value: string) => {
    const valueLines = value.replace(/\n$/, "").split("\n");
    valueLines.forEach((l) =>
      typography(l, (rule, m) => report(rule, `${field}: ${m}`)),
    );
    balance(valueLines, (m) => report("unbalanced", `${field}: ${m}`));
  };
  prose("title", meta.title);
  meta.notes?.forEach((n, i) => prose(`notes[${i}]`, n.text));

  if (!meta.title_case_ok) {
    const problem = titleCaseProblem(meta.title);
    if (problem)
      report(
        "title-case",
        `${problem} (set title_case_ok: true if it is correct)`,
      );
  }

  if (meta.author !== dir)
    report(
      "author-directory",
      `author «${meta.author}» is not the directory «${dir}»`,
    );
  else if (!ids.authors.has(meta.author))
    report("unknown-author", `unknown author «${meta.author}»`);

  if (meta.status === "reviewed") {
    const ed = meta.edition;
    if (!ed?.reviewed_on)
      report("reviewed-on", "status: reviewed requires edition.reviewed_on");
    if (ed) {
      const needed =
        ed.copy_text === "written" ? ["written", "audio"] : [ed.copy_text];
      const missing = needed.filter(
        (w) => !ed.checked.includes(w as "written" | "audio"),
      );
      if (missing.length > 0) {
        report(
          "reviewed-checked",
          `status: reviewed requires edition.checked to include ${missing.join(", ")}`,
        );
      }
    }
    for (const u of parsed?.uncertain ?? []) {
      report(
        "uncertain",
        `v. ${u.verse}: uncertain reading «${u.text}» in a reviewed work`,
        undefined,
        "warning",
      );
    }
  }

  for (const c of meta.collections ?? []) {
    if (!ids.collections.has(c.id))
      report("unknown-collection", `unknown collection «${c.id}»`);
  }
  for (const t of meta.tags ?? []) {
    if (!ids.tags.has(t.id)) report("unknown-tag", `unknown tag «${t.id}»`);
  }
  if (parsed) {
    for (const n of meta.notes ?? []) {
      if (n.verse !== undefined && n.verse > parsed.verseCount) {
        report(
          "note-verse",
          `note anchored to v. ${n.verse}, but the work has ${parsed.verseCount} verses`,
        );
      }
    }
  }

  return { path, id: `${dir}/${slug}`, meta };
}

function readYaml(text: string, fail: (message: string) => void): unknown {
  try {
    // YAML 1.2 core schema: dates stay strings, so impossible dates are caught.
    return parseYaml(text);
  } catch (e) {
    fail((e as Error).message.split("\n")[0] ?? "invalid YAML");
    return undefined;
  }
}

function zodMessages(error: z.ZodError): string[] {
  return error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
  );
}

/** Reports and removes `text` from patreon sources so the schema error is specific. */
function stripPatreonText(
  data: unknown,
  report: (index: number) => void,
): unknown {
  if (
    typeof data !== "object" ||
    data === null ||
    !("sources" in data) ||
    !Array.isArray(data.sources)
  ) {
    return data;
  }
  const sources = data.sources.map((s: unknown, i: number) => {
    if (
      typeof s === "object" &&
      s !== null &&
      "kind" in s &&
      s.kind === "patreon" &&
      "text" in s
    ) {
      report(i);
      const { text: _text, ...rest } = s;
      return rest;
    }
    return s;
  });
  return { ...data, sources };
}

const LINE_RULES: [RegExp, string, string][] = [
  [/["']/, "straight-quote", "straight quote; use «», “” or ’"],
  [/\.\.\./, "ellipsis", "three dots; use …"],
  [/(?:^|\s)-(?:\s|$)|--/, "hyphen-dash", "hyphen used as a dash; use —"],
  [/ {2}/, "double-space", "double space"],
  [/[ \t]$/, "trailing-whitespace", "trailing whitespace"],
  [/\t/, "tab", "tab character"],
];

function typography(
  line: string,
  report: (rule: string, message: string) => void,
) {
  for (const [re, rule, message] of LINE_RULES)
    if (re.test(line)) report(rule, message);
}

const PAIRS: [string, string][] = [
  ["¿", "?"],
  ["¡", "!"],
  ["«", "»"],
];

/** Pairs may span lines (enjambment), so balance is checked over the whole text. */
function balance(
  lines: string[],
  report: (message: string, lineIndex: number) => void,
) {
  for (const [open, close] of PAIRS) {
    const stack: number[] = [];
    lines.forEach((line, i) => {
      // The «?» of an uncertain-reading marker «{?…}» is not punctuation.
      for (const ch of line.replaceAll("{?", "{")) {
        if (ch === open) stack.push(i);
        else if (ch === close && stack.pop() === undefined)
          report(`«${close}» without an opening «${open}»`, i);
      }
    });
    const unclosed = stack[0];
    if (unclosed !== undefined)
      report(`«${open}» is never closed by «${close}»`, unclosed);
  }
}

/** Sentence case: capital on the first word only, except after a sentence end. */
function titleCaseProblem(title: string): string | undefined {
  const words = title.split(/\s+/).filter(Boolean);
  const initial = (w: string) => /\p{L}/u.exec(w)?.[0];
  const first = initial(words[0] ?? "");
  if (first && first !== first.toUpperCase())
    return "title must begin with a capital";
  for (let i = 1; i < words.length; i++) {
    const c = initial(words[i] ?? "");
    const afterSentence = /[.?!…]$/.test(words[i - 1] ?? "");
    if (c && c !== c.toLowerCase() && !afterSentence) {
      return `title is not in sentence case («${words[i]}»)`;
    }
  }
  return undefined;
}

function positionProblem(
  members: { id: string; position: number | undefined }[],
  noun: "collection" | "tag",
): string | undefined {
  const missing = members
    .filter((m) => m.position === undefined)
    .map((m) => m.id);
  if (missing.length > 0)
    return `ordered ${noun} members without position: ${missing.join(", ")}`;
  const positions = members
    .map((m) => m.position as number)
    .sort((a, b) => a - b);
  for (let i = 1; i < positions.length; i++) {
    const [prev, cur] = [positions[i - 1] as number, positions[i] as number];
    if (cur === prev) return `position ${cur} is used more than once`;
    if (cur !== prev + 1)
      return `positions are not contiguous: ${prev} is followed by ${cur}`;
  }
  return undefined;
}
