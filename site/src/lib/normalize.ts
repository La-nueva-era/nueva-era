// NFD → strip combining marks → lowercase. ñ folds to n.
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
