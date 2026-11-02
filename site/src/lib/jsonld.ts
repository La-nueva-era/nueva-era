// Structured data for work pages (SPEC §12): MusicRecording + CreativeWork.

type Link = { name: string; url: string };

export type WorkLd = {
  url: string;
  title: string;
  author: Link;
  published: string;
  youtubeId: string;
  /** The established text, plain. */
  text: string;
  collections: Link[];
};

export function workJsonLd(w: WorkLd): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["MusicRecording", "CreativeWork"],
    name: w.title,
    url: w.url,
    inLanguage: "es",
    text: w.text,
    datePublished: w.published,
    author: { "@type": "Person", name: w.author.name, url: w.author.url },
    ...(w.collections.length > 0
      ? {
          isPartOf: w.collections.map((c) => ({
            "@type": "CreativeWork",
            name: c.name,
            url: c.url,
          })),
        }
      : {}),
    sameAs: `https://www.youtube.com/watch?v=${w.youtubeId}`,
  };
}

/** JSON for a <script type="application/ld+json">: "<" is escaped so the text cannot close the element. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
