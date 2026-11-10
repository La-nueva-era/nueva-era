import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { workSchema } from "../../site/src/lib/schema.ts";
import {
  existingVideoIds,
  slugify,
  cleanTitle,
  stubFor,
  type Video,
} from "./youtube-import.ts";

const video: Video = {
  id: "moE8OOc0sDs",
  title: "Marketing y cobardía",
  upload_date: "20210914",
  description: "Cuando el valor del dinero\nsupera todo valor.",
};

const SOLITARIO = { id: "solitario", name: "Solitario" };

describe("cleanTitle", () => {
  it("strips the author prefix and bracketed tags", () => {
    expect(cleanTitle("Solitario - Os lo dije [LETRA]", "Solitario")).toBe(
      "Os lo dije",
    );
    expect(
      cleanTitle(
        "Solitario - El más profundo de los solipsismos [ Letra ]",
        "Solitario",
      ),
    ).toBe("El más profundo de los solipsismos");
    expect(cleanTitle("solitario – Nueva era", "Solitario")).toBe("Nueva era");
  });

  it("keeps everything else, including parentheses", () => {
    expect(
      cleanTitle("Solitario - Volar (Prod. TERROR BEATS)", "Solitario"),
    ).toBe("Volar (Prod. TERROR BEATS)");
    expect(cleanTitle("Otro autor - Tema", "Solitario")).toBe(
      "Otro autor - Tema",
    );
  });
});

describe("slugify", () => {
  it("makes kebab-case ASCII from a Spanish title", () => {
    expect(slugify("Marketing y cobardía")).toBe("marketing-y-cobardia");
    expect(slugify("El más profundo de los solipsismos")).toBe(
      "el-mas-profundo-de-los-solipsismos",
    );
    expect(slugify("¿Por qué? ¡Año, ñu!")).toBe("por-que-ano-nu");
    expect(slugify("  Uno -- Dos [Letra] ")).toBe("uno-dos-letra");
  });
});

describe("stubFor", () => {
  it("uses the cleaned title for the title and the slug", () => {
    const stub = stubFor(
      { ...video, title: "Solitario - Os lo dije [LETRA]" },
      SOLITARIO,
    );
    expect(stub.path).toBe("solitario/os-lo-dije.md");
    expect(parseYaml(stub.text.split(/^---\n/m)[1] ?? "").title).toBe(
      "Os lo dije",
    );
  });

  it("builds a hidden draft with the description as a source and an empty body", () => {
    const stub = stubFor(video, SOLITARIO);
    expect(stub.path).toBe("solitario/marketing-y-cobardia.md");
    const [, front, body] = stub.text.split(/^---\n/m);
    expect(body).toBe("");
    const meta = parseYaml(front ?? "");
    expect(meta).toEqual({
      title: "Marketing y cobardía",
      author: "solitario",
      youtube: { id: "moE8OOc0sDs", published: "2021-09-14" },
      status: "draft",
      visibility: "hidden",
      sources: [
        {
          kind: "youtube-description",
          date: "2021-09-14",
          text: "Cuando el valor del dinero\nsupera todo valor.",
        },
      ],
    });
    expect(workSchema.safeParse(meta).success).toBe(true);
  });

  it("omits the source when the description is empty", () => {
    const stub = stubFor({ ...video, description: "" }, SOLITARIO);
    expect(parseYaml(stub.text.split(/^---\n/m)[1] ?? "")).not.toHaveProperty(
      "sources",
    );
  });
});

describe("existingVideoIds", () => {
  it("reads youtube.id from every work file, including _ files", () => {
    const files = {
      "a.md":
        "---\ntitle: A\nyoutube:\n  id: AAAAAAAAAAA\n  published: 2021-01-01\n---\nuno\n",
      "_b.md": "---\nyoutube:\n  id: BBBBBBBBBBB\n---\n",
      "c.md": "sin front matter\n",
    };
    expect(existingVideoIds(files)).toEqual(
      new Set(["AAAAAAAAAAA", "BBBBBBBBBBB"]),
    );
  });
});
