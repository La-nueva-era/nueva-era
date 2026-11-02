// Content collections over ../content (SPEC §4). Schemas live in lib/schema.ts
// so scripts/lint-content.ts validates with exactly the same rules.

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  authorSchema,
  collectionSchema,
  tagSchema,
  workSchema,
} from "./lib/schema.ts";

const CONTENT = "../content";
// Files whose name starts with "_" are ignored by the build (SPEC §6.1).
const yaml = (dir: string) =>
  glob({ base: `${CONTENT}/${dir}`, pattern: "[^_]*.yaml" });

export const collections = {
  authors: defineCollection({ loader: yaml("authors"), schema: authorSchema }),
  collections: defineCollection({
    loader: yaml("collections"),
    schema: collectionSchema,
  }),
  tags: defineCollection({ loader: yaml("tags"), schema: tagSchema }),
  works: defineCollection({
    loader: glob({
      base: CONTENT,
      pattern: ["solitario/[^_]*.md", "ozelot/[^_]*.md"],
      // The work id is <author>/<slug>, the path itself; never re-slugified.
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
      // Bodies are parsed by lib/parse.ts, not rendered as Markdown.
      deferRender: true,
    }),
    schema: workSchema,
  }),
};
