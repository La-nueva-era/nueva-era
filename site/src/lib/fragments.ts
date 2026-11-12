// Verses the editor features on the home page (content/fragments.yaml).
// Entries reference a work and a verse range; the text always comes from the
// work itself, so a fragment can never drift from the established text.
// An optional highlight (a verse or range, numbered as in the work) marks the
// verses to stand out inside the fragment; an optional cut marks where the
// passage was cut from its work.

import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { plainText } from "./parse.ts";

const verseRef = (field: string) =>
  z.union([
    z.number().int().min(1),
    z
      .tuple([z.number().int().min(1), z.number().int().min(1)])
      .refine(([a, b]) => a <= b, `${field}: range must go up`),
  ]);
const range = (v: number | [number, number]) =>
  typeof v === "number" ? { from: v, to: v } : { from: v[0], to: v[1] };

const entry = z
  .strictObject({
    work: z
      .string()
      .regex(
        /^[a-z0-9]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "expected a work id as <author>/<slug>",
      ),
    verses: verseRef("verses"),
    highlight: verseRef("highlight").optional(),
    cut: z.enum(["start", "end", "both"]).optional(),
  })
  .refine(
    ({ verses, highlight }) => {
      if (highlight === undefined) return true;
      const v = range(verses);
      const h = range(highlight);
      return h.from >= v.from && h.to <= v.to;
    },
    { message: "highlight must be inside verses", path: ["highlight"] },
  )
  .transform(({ work, verses, highlight, cut }) => ({
    work,
    ...range(verses),
    ...(highlight === undefined ? {} : { highlight: range(highlight) }),
    ...(cut === undefined ? {} : { cut }),
  }));

export type FragmentRef = z.infer<typeof entry>;
export type Fragment = {
  title: string;
  href: string;
  verses: string[];
  /** Positions in `verses` of the highlighted verses. */
  highlight?: number[];
  /** Where the passage is cut from its work, shown as «[…]». */
  cut?: "start" | "end" | "both";
};
type WorkLookup = Map<
  string,
  { title: string; url: string; public: boolean; verses: string[] }
>;

export function parseFragments(yaml: string): FragmentRef[] {
  const result = z.array(entry).safeParse(parseYaml(yaml) ?? []);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `content/fragments.yaml: ${issue?.path.join(".")}: ${issue?.message}`,
    );
  }
  return result.data;
}

export function resolveFragments(
  refs: FragmentRef[],
  works: WorkLookup,
): Fragment[] {
  return refs.map(({ work, from, to, highlight, cut }) => {
    const w = works.get(work);
    if (!w) throw new Error(`content/fragments.yaml: unknown work «${work}»`);
    if (!w.public)
      throw new Error(`content/fragments.yaml: «${work}» is hidden`);
    if (to > w.verses.length) {
      throw new Error(
        `content/fragments.yaml: «${work}» has ${w.verses.length} verses`,
      );
    }
    return {
      title: w.title,
      href: `${w.url}#v${from === to ? from : `${from}-${to}`}`,
      verses: w.verses.slice(from - 1, to).map(plainText),
      ...(highlight === undefined
        ? {}
        : {
            highlight: Array.from(
              { length: highlight.to - highlight.from + 1 },
              (_, i) => highlight.from - from + i,
            ),
          }),
      ...(cut === undefined ? {} : { cut }),
    };
  });
}
