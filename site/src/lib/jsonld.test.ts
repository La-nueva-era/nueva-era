import { describe, expect, it } from "vitest";
import { workJsonLd } from "./jsonld.ts";

describe("workJsonLd", () => {
  const base = {
    url: "https://lanuevaera.art/solitario/a",
    title: "Contra el arte subjetivo",
    author: { name: "Solitario", url: "https://lanuevaera.art/solitario" },
    published: "2023-09-14",
    youtubeId: "AAAAAAAAAAA",
    text: "uno\ndos",
    collections: [
      { name: "Ciclo", url: "https://lanuevaera.art/colecciones/ciclo" },
    ],
  };

  it("describes the work as MusicRecording + CreativeWork with its text", () => {
    const ld = workJsonLd(base);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": ["MusicRecording", "CreativeWork"],
      name: "Contra el arte subjetivo",
      url: base.url,
      inLanguage: "es",
      text: "uno\ndos",
      datePublished: "2023-09-14",
      author: { "@type": "Person", name: "Solitario", url: base.author.url },
      isPartOf: [
        {
          "@type": "CreativeWork",
          name: "Ciclo",
          url: base.collections[0]?.url,
        },
      ],
      sameAs: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
    });
  });

  it("omits isPartOf without collections", () => {
    expect(workJsonLd({ ...base, collections: [] })).not.toHaveProperty(
      "isPartOf",
    );
  });

  it("serializes safely inside a script element", async () => {
    const { jsonLdScript } = await import("./jsonld.ts");
    expect(jsonLdScript({ text: "</script><b>" })).not.toContain("</script>");
  });
});
