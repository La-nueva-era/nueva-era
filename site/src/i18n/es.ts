// Every UI string of the site (CLAUDE.md: Spanish UI strings live here).
// Source of each string, so the editor can review what was not given:
//   [spec]      docs/SPEC.md
//   [mockup]    docs/design/work-page.html
//   [PROPOSED]  written by the implementer; pending the editor's approval

export const es = {
  site: {
    name: "La nueva era", // [spec]
    skip: "Saltar al contenido", // [PROPOSED]
  },
  nav: {
    label: "Secciones", // [mockup]
    indices: "Índices", // [spec]
  },
  work: {
    draft: "borrador", // [spec]
    copy: "Copiar", // [spec]
    copyTitle: "Copiar el texto del poema", // [mockup]
    copyMore: "Más opciones de copia", // [mockup]
    copyPageLink: "Copiar link de la página", // [spec]
    plainText: "Texto plano (.md)", // [spec]
    watchOnYouTube: "Ver en YouTube", // [spec]
    play: (title: string) => `Reproducir «${title}» en YouTube`, // [mockup]
    verseLink: (n: number) => `Enlace al v. ${n}`, // [mockup]
    uncertain: "Lectura dudosa", // [mockup]
    uncertainWithNote: "Lectura dudosa; véase la nota", // [mockup]
    noteOpen: (n: number) => `Ver nota al verso ${n}`, // [mockup]
    noteClose: "Cerrar nota", // [mockup]
    notes: "Notas de esta edición", // [spec]
    noVerse: "—", // [mockup]
    extra: "Información adicional", // [spec]
    description: "descripción del vídeo", // [mockup]
    communityPost: "publicación de la comunidad", // [mockup]
    patreon: "Patreon, para suscriptores — apoya al autor para leerlo", // [mockup]
    external: "enlace externo", // [PROPOSED]
    around: "En torno a esta obra", // [spec]
    related: "El editor relaciona", // [mockup]
    relatedFrom: "Relacionada desde", // [PROPOSED]
    mentionedIn: "Mencionada en", // [PROPOSED]
    mentions: "Menciona", // [PROPOSED]
    selQuoteLink: "Copiar link de la cita", // [spec]
    selQuoteText: "Copiar cita con versos", // [spec]
    clearHighlight: (range: string) => `Quitar resaltado (${range})`, // [spec] + [mockup]
    toastPoem: "Poema copiado", // [mockup]
    toastLink: "Link copiado", // [mockup]
    toastQuoteLink: "Link de la cita copiado", // [mockup]
    toastQuote: "Cita copiada", // [mockup]
    toastFailed: "No se pudo copiar", // [PROPOSED]
  },
  pack: {
    files: "Archivos", // [PROPOSED]
    works: "Obras", // [PROPOSED]
    full: "Edición completa", // [PROPOSED]
    author: (name: string) => `Obra completa de ${name}`, // [PROPOSED]
    collection: (title: string) => `Colección: ${title}`, // [PROPOSED]
    tag: (title: string) => `Etiqueta: ${title}`, // [PROPOSED]
  },
  indices: {
    titles: "Índice de títulos", // [PROPOSED] (URL /indice/titulos is [spec])
    firstVerses: "Índice de primeros versos", // [PROPOSED] (URL /indice/primeros-versos is [spec])
  },
  search: {
    label: "Buscar", // [mockup]
    placeholder: "Buscar en la obra…  ( / )", // [mockup]
    open: "Abrir la búsqueda", // [PROPOSED]
    inVerses: (q: string) => `Buscar «${q}» en los versos →`, // [mockup]
    title: "Buscar", // [PROPOSED]
    query: "Palabras", // [PROPOSED]
    author: "Autor", // [PROPOSED]
    collection: "Colección", // [PROPOSED]
    tag: "Etiqueta", // [PROPOSED]
    any: "Todos", // [PROPOSED]
    anyF: "Todas", // [PROPOSED]
    loading: "Cargando el índice…", // [PROPOSED]
    none: "Sin resultados.", // [PROPOSED]
    count: (verses: number, works: number) =>
      `${verses === 1 ? "1 verso" : `${verses} versos`} en ${works === 1 ? "1 obra" : `${works} obras`}`, // [PROPOSED]
  },
  pages: {
    works: "Obras", // [PROPOSED]
    collections: "Colecciones", // [PROPOSED] (URL /colecciones is [spec])
    tags: "Etiquetas", // [PROPOSED] (URL /etiquetas is [spec])
    chronology: "Cronología", // [PROPOSED] (URL /cronologia is [spec])
    support: "Apoyar al autor", // [PROPOSED]
    composed: (when: string) => `compuesta en ${when}`, // [PROPOSED]
    workCount: (n: number) => (n === 1 ? "1 obra" : `${n} obras`), // [PROPOSED]
    noWorks: "Todavía no hay obras publicadas en esta edición.", // [PROPOSED]
    noCollections: "Todavía no hay colecciones.", // [PROPOSED]
    noTags: "Todavía no hay etiquetas.", // [PROPOSED]
    kind: { album: "álbum", ep: "EP", cycle: "ciclo" }, // [PROPOSED]
  },
  prefs: {
    open: "Preferencias de lectura", // [mockup]
    title: "preferencias de lectura", // [mockup]
    nums: "Números de verso", // [mockup]
    numsAll: "Todos", // [mockup]
    numsEvery5: "Cada cinco", // [mockup]
    numsNone: "Ninguno", // [mockup]
    theme: "Tema", // [mockup]
    themeDark: "Oscuro", // [mockup]
    themeLight: "Claro", // [mockup]
  },
} as const;

/** Spanish long date, e.g. "14 de septiembre de 2021". [PROPOSED] format */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
