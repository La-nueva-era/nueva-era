// Citation strings: `Author, «Title» (Collection, n), vv. a–b`.

export type Citable = {
  author: string;
  title: string;
  collection?: { title: string; position?: number | undefined } | undefined;
};

export function verseRange(a: number, b: number): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return lo === hi ? `v. ${lo}` : `vv. ${lo}–${hi}`;
}

export function cite(work: Citable, range?: [number, number]): string {
  const c = work.collection;
  const series = c
    ? ` (${c.title}${c.position === undefined ? "" : `, ${c.position}`})`
    : "";
  const verses = range ? `, ${verseRange(range[0], range[1])}` : "";
  return `${work.author}, «${work.title}»${series}${verses}`;
}
