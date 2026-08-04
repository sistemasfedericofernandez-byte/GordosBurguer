// Fotos reales de los productos (public/menu/*.png), asociadas por nombre.
// Si un producto no tiene foto todavía, se usa un emoji de categoría como respaldo.
// Todavía no hay fotos de los productos de Gordo's Burger — agregá acá el
// slug (nombre en minúsculas, sin acentos, espacios -> guiones) a medida que
// subas fotos a public/menu/.
const AVAILABLE_SLUGS = new Set<string>([]);

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // saca "(unidad)", "(1)", etc.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Devuelve la ruta pública de la foto del producto, o null si todavía no hay una. */
export function menuItemImage(name: string): string | null {
  const slug = slugify(name);
  if (AVAILABLE_SLUGS.has(slug)) return `/menu/${slug}.png`;
  return null;
}
