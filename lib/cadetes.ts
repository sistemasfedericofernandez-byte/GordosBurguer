import { prisma } from "@/lib/prisma";

/**
 * Si el pedido de envío no trae un cadete asignado a mano y el local tiene un único cadete
 * activo cargado, se lo asigna automáticamente (pensado para locales que reparten con un solo
 * delivery). Si hay 0 o más de un cadete activo, no asigna nada y queda "Sin asignar" como antes.
 */
export async function resolveCadeteId(providedId: string | null | undefined): Promise<string | null> {
  if (providedId) return providedId;
  const active = await prisma.cadete.findMany({ where: { active: true } });
  if (active.length === 1) return active[0].id;
  return null;
}
