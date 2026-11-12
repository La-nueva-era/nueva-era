export const es = {
  site: {
    name: "La nueva era",
    skip: "Saltar al contenido",
  },
  notice: {
    text: "Este proyecto está en desarrollo: algunas obras están incompletas y pueden tener errores de transcripción.",
    close: "Cerrar aviso",
  },
  footer: {
    label: "Pie de página",
    line: "Archivo de la obra de Solitario y Ozelot. Proyecto independiente y no oficial, sin vínculo con los autores.",
    code: "Código fuente",
    downloads: "Descargas",
    rss: "RSS",
  },
  nav: {
    label: "Secciones",
    indices: "Índices",
  },
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
  prefs: {
    open: "Preferencias de lectura",
    title: "Preferencias de lectura",
    nums: "Números de verso",
    numsAll: "Todos",
    numsEvery5: "Cada cinco",
    numsNone: "Ninguno",
    toLight: "Cambiar a tema claro",
    toDark: "Cambiar a tema oscuro",
  },
} as const;
