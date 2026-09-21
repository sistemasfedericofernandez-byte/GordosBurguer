import { prisma } from "@/lib/prisma";
import { findGymMemberByDni, normalizeDni } from "@/lib/fittime";
import { getGymDiscountPercent, getGymStaffList } from "@/lib/auth";

export type CouponCheckResult =
  // `dni` viene normalizado (solo dígitos): es la clave del límite de una vez por mes, así
  // "30.123.456" y "30123456" no pueden usarse como dos cupones distintos.
  | { ok: true; dni: string; memberName: string; discountPercent: number }
  | { ok: false; reason: "not_found" | "expired" | "already_used" | "roster_unavailable" };

/** "YYYY-MM" en hora de Argentina, para el límite de una vez por mes. */
export function monthKeyFor(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/**
 * Valida un DNI como cupón de descuento de Fit Time: primero contra la lista de profes
 * exceptuados (cargada a mano en Configuración) y, si no está ahí, contra el sistema de gestión
 * del gimnasio (alumno con la cuota vigente, ver lib/fittime.ts). También chequea que no se haya
 * usado ya el descuento este mes. No tiene efectos secundarios — no registra el uso (eso lo hace
 * /api/orders al crear el pedido).
 */
export async function checkCoupon(rawDni: string): Promise<CouponCheckResult> {
  const dni = normalizeDni(rawDni);
  if (!dni) return { ok: false, reason: "not_found" };

  let memberName: string;

  const staff = await getGymStaffList();
  const staffMatch = staff.find((s) => normalizeDni(s.dni) === dni);
  if (staffMatch) {
    memberName = staffMatch.name;
  } else {
    const lookup = await findGymMemberByDni(dni);
    if (lookup.status === "unavailable") return { ok: false, reason: "roster_unavailable" };
    if (lookup.status === "not_found") return { ok: false, reason: "not_found" };
    // Sin ningún pago cargado (daysRemaining null) tampoco cuenta como cuota vigente.
    if (lookup.daysRemaining === null || lookup.daysRemaining <= 0) return { ok: false, reason: "expired" };
    memberName = lookup.name;
  }

  const monthKey = monthKeyFor(new Date());
  const used = await prisma.couponUse.findUnique({ where: { dni_monthKey: { dni, monthKey } } });
  if (used) return { ok: false, reason: "already_used" };

  return { ok: true, dni, memberName, discountPercent: await getGymDiscountPercent() };
}

export const couponReasonLabel: Record<Exclude<CouponCheckResult, { ok: true }>["reason"], string> = {
  not_found: "Ese DNI no figura como alumno de Fit Time.",
  expired: "Tu cuota de Fit Time no está vigente.",
  already_used: "Ya usaste tu descuento de Fit Time este mes.",
  roster_unavailable: "No pudimos verificar el cupón en este momento, probá de nuevo en un rato.",
};
