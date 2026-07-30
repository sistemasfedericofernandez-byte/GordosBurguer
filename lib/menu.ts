import { prisma } from "@/lib/prisma";
import { DEFAULT_MENU } from "@/lib/domain";
import { getMenuFromSheet } from "@/lib/sheets";
import type { MenuItem } from "@/lib/types";

/** Catálogo activo, leyendo primero de Sheets (fuente editable) y si no de Postgres. */
export async function getActiveMenu(): Promise<MenuItem[]> {
  const fromSheet = await getMenuFromSheet();
  if (fromSheet) return fromSheet.filter((m) => m.active);

  let items = await prisma.menuItem.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  if (items.length === 0) {
    await prisma.menuItem.createMany({ data: DEFAULT_MENU });
    items = await prisma.menuItem.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
  return items;
}
