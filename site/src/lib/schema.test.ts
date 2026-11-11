import { describe, expect, it } from "vitest";
import { authorSchema, workSchema } from "./schema.ts";

const work = {
  title: "Título",
  author: "solitario",
  youtube: { id: "AAAAAAAAAAA", published: "2021-09-14" },
  status: "draft",
  visibility: "public",
};

describe("workSchema", () => {
  it("accepts a minimal work", () => {
    expect(workSchema.safeParse(work).success).toBe(true);
  });

  it("converts a Date from the front matter parser back to YYYY-MM-DD", () => {
    const out = workSchema.parse({
      ...work,
      youtube: {
        id: "AAAAAAAAAAA",
        published: new Date("2021-09-14T00:00:00Z"),
      },
    });
    expect(out.youtube.published).toBe("2021-09-14");
  });

  it("rejects impossible or malformed dates", () => {
    for (const published of ["2021-02-30", "2021-9-14", "14/09/2021"]) {
      const r = workSchema.safeParse({
        ...work,
        youtube: { id: "AAAAAAAAAAA", published },
      });
      expect(r.success, published).toBe(false);
    }
  });

  it("rejects unknown fields", () => {
    expect(workSchema.safeParse({ ...work, titel: "x" }).success).toBe(false);
  });

  it("rejects a malformed YouTube id", () => {
    const r = workSchema.safeParse({
      ...work,
      youtube: { id: "short", published: "2021-09-14" },
    });
    expect(r.success).toBe(false);
  });

  it("accepts position 0 in a collection", () => {
    const r = workSchema.safeParse({
      ...work,
      collections: [{ id: "en-defensa-del-arte", position: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it("never allows text on a patreon source", () => {
    const patreon = {
      kind: "patreon",
      title: "Post",
      url: "https://www.patreon.com/posts/1",
      date: "2021-09-21",
    };
    expect(workSchema.safeParse({ ...work, sources: [patreon] }).success).toBe(
      true,
    );
    expect(
      workSchema.safeParse({ ...work, sources: [{ ...patreon, text: "x" }] })
        .success,
    ).toBe(false);
  });

  it("rejects malformed related work ids", () => {
    expect(
      workSchema.safeParse({ ...work, related: ["solitario/nueva-era"] })
        .success,
    ).toBe(true);
    expect(
      workSchema.safeParse({ ...work, related: ["nueva-era"] }).success,
    ).toBe(false);
  });
});

describe("authorSchema", () => {
  it("accepts id and name alone", () => {
    expect(
      authorSchema.safeParse({ id: "solitario", name: "Solitario" }).success,
    ).toBe(true);
  });

  it("accepts a year or a date for born", () => {
    expect(
      authorSchema.safeParse({ id: "a", name: "A", born: 1991 }).success,
    ).toBe(true);
    expect(
      authorSchema.safeParse({ id: "a", name: "A", born: "1991-03-02" })
        .success,
    ).toBe(true);
    expect(
      authorSchema.safeParse({ id: "a", name: "A", born: "1991" }).success,
    ).toBe(false);
  });
});
