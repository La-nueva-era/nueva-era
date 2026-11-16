// Find in the text of a work: case- and accent-insensitive, the way a
// browser's own find-in-page behaves. The ñ is a letter of its own.

/** Lower-cases and strips accents, keeping one unit of output per unit of
 *  input, so an offset in the folded text is the same offset in the text. */
export function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const base =
      ch === "ñ" || ch === "Ñ"
        ? "ñ"
        : ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

/** Start offsets of every non-overlapping match of `query` in `text`. */
export function matches(text: string, query: string): number[] {
  const needle = fold(query);
  if (!needle) return [];
  const hay = fold(text);
  const found: number[] = [];
  for (
    let i = hay.indexOf(needle);
    i !== -1;
    i = hay.indexOf(needle, i + needle.length)
  )
    found.push(i);
  return found;
}
