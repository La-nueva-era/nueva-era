export const es = {
  rss: {
    description: "Obras ordenadas de la más reciente a la más antigua.",
  },
  pack: {
    files: "Archivos",
    works: "Obras",
    full: "Archivo completo",
    author: (name: string) => `Obra completa de ${name}`,
    collection: (title: string) => `Colección: ${title}`,
    tag: (title: string) => `Etiqueta: ${title}`,
  },
} as const;
