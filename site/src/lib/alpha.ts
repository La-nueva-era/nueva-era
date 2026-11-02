// Alphabetical order for the title and first-verse indices: Spanish collation
// (ñ after n), ignoring case, accents and leading punctuation (¿ ¡ « …).

const collator = new Intl.Collator("es", {
  sensitivity: "base",
  ignorePunctuation: true,
});
const lead = /^[^\p{L}\p{N}]+/u;

export function alphabetical<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    collator.compare(key(a).replace(lead, ""), key(b).replace(lead, "")),
  );
}

/** Index letter: A–Z without accents, Ñ on its own, # for anything else. */
export function initial(text: string): string {
  const c = text.replace(lead, "").charAt(0).toUpperCase();
  if (c === "Ñ") return c;
  const base = c.normalize("NFD").replace(/\p{M}/gu, "");
  return /[A-Z]/.test(base) ? base : "#";
}
