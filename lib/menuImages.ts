// Fotos reales de los productos (public/menu/*.png), asociadas por nombre.
// Si un producto no tiene foto todavía, se usa un emoji de categoría como respaldo.
const AVAILABLE_SLUGS = new Set([
  "american-cheese",
  "blue-onion",
  "doble-cheese",
  "empanadas-de-carne-cortada-a-cuchillo",
  "empanadas-de-carne-xl",
  "empanadas-de-jamon-y-queso-xl",
  "hamburguesa-amazing",
  "hamburguesa-especial",
  "hamburguesas-krusty",
  "medio-misil-de-lomito",
  "mila-en-pan-frances-con-papas",
  "milanesa-de-carne-a-caballo",
  "milanesa-de-carne-con-papas",
  "milanesa-de-carne-napolitana",
  "papa-doble",
  "papas-gratinadas-con-cheddar",
  "papas-gratinadas-de-muzzarella",
  "pizza-calabresa",
  "pizza-jamon-y-morrones",
  "pizza-muzzarella",
]);

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
