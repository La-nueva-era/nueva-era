// Accent and case folding for search and matching (SPEC §10):
// NFD → strip combining marks → lowercase. ñ folds to n.
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
