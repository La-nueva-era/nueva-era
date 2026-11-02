// Zod schemas for the edition's data model. SPEC §5.
// Shared by the Astro content collections and by scripts/lint-content.ts, so it
// must stay free of Astro imports. Objects are strict: an unknown or misspelled
// field is an error, never silently dropped.

import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date written as YYYY-MM-DD. Kept as a string.
 * Astro's Markdown front matter parser turns unquoted dates into Date objects;
 * they are converted back. That parser rolls impossible dates over
 * (2021-02-30 → 2021-03-02), so scripts/lint-content.ts, which reads the raw
 * YAML, is what rejects them.
 */
export const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z
    .string()
    .regex(ISO_DATE, "expected a date as YYYY-MM-DD")
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
    }, "not a real calendar date"),
);

/** A year (1991) or a full date ("1991-03-02"). */
export const yearOrDate = z.union([
  z.number().int().min(1000).max(9999),
  isoDate,
]);

const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "expected a kebab-case ASCII id");
const workId = z
  .string()
  .regex(
    /^[a-z0-9]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "expected a work id as <author>/<slug>",
  );
const url = z.url({ protocol: /^https$/ });
const position = z.number().int().min(0);

export const authorSchema = z.strictObject({
  id,
  name: z.string().min(1),
  alias: z.string().min(1).optional(),
  born: yearOrDate.optional(),
  died: yearOrDate.nullable().optional(),
  bio: z.string().optional(),
  links: z
    .strictObject({
      youtube: url.optional(),
      patreon: url.optional(),
    })
    .optional(),
  support: z
    .array(z.strictObject({ label: z.string().min(1), url }))
    .optional(),
});

export const collectionSchema = z.strictObject({
  id,
  author: id,
  title: z.string().min(1),
  kind: z.enum(["album", "ep", "cycle"]),
  ordered: z.boolean(),
  description: z.string().optional(),
});

export const tagSchema = z.strictObject({
  id,
  title: z.string().min(1),
  author: id,
  ordered: z.boolean(),
  description: z.string().optional(),
});

const membership = z.strictObject({ id, position: position.optional() });

const source = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("youtube-description"),
    date: isoDate,
    text: z.string(),
  }),
  z.strictObject({
    kind: z.literal("community-post"),
    title: z.string().min(1),
    url,
    date: isoDate,
  }),
  // Patreon posts are links only; their text is never reproduced (EDITORIAL §10).
  z.strictObject({
    kind: z.literal("patreon"),
    title: z.string().min(1),
    url,
    date: isoDate,
  }),
  z.strictObject({
    kind: z.literal("external"),
    title: z.string().min(1),
    url,
    date: isoDate.optional(),
  }),
]);

export const workSchema = z.strictObject({
  title: z.string().min(1),
  title_case_ok: z.boolean().optional(),
  author: id,
  youtube: z.strictObject({
    id: z
      .string()
      .regex(
        /^[A-Za-z0-9_-]{11}$/,
        "expected an 11-character YouTube video id",
      ),
    published: isoDate,
  }),
  composed: yearOrDate.nullable().optional(),
  collections: z.array(membership).optional(),
  tags: z.array(membership).optional(),
  related: z.array(workId).optional(),
  voices: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        role: z.enum(["feat", "chorus", "spoken"]),
      }),
    )
    .optional(),
  credits: z
    .strictObject({ producer: z.string().min(1).optional() })
    .optional(),
  status: z.enum(["draft", "reviewed"]),
  visibility: z.enum(["public", "hidden"]),
  sources: z.array(source).optional(),
  notes: z
    .array(
      z.strictObject({
        verse: z.number().int().min(1).optional(),
        text: z.string().min(1),
      }),
    )
    .optional(),
  edition: z
    .strictObject({
      copy_text: z.enum(["written", "audio"]),
      checked: z.array(z.enum(["written", "audio"])),
      reviewed_on: isoDate.optional(),
    })
    .optional(),
});

export type Author = z.infer<typeof authorSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type WorkMeta = z.infer<typeof workSchema>;
export type Source = z.infer<typeof source>;
