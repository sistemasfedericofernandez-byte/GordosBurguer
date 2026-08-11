import { prisma } from "@/lib/prisma";
import { getGymPaymentsFromSheet } from "@/lib/sheets";
import { getGymDiscountPercent, getGymStaffList } from "@/lib/auth";

export type CouponCheckResult =
  | { ok: true; memberName: string; discountPercent: number }
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
 * Valida un DNI como cupón de descuento de Fit Time: primero contra la lista de
 * profes exceptuados (cargada a mano en Configuración), y si no está ahí, contra
 * el historial de pagos real del gimnasio (leído en vivo de su Google Sheet).
 * También chequea que no se haya usado ya el descuento este mes. No tiene efectos
 * secundarios — no registra el uso (eso lo hace /api/orders al crear el pedido).
 */
export async function checkCoupon(dni: string): Promise<CouponCheckResult> {
  const cleanDni = dni.trim();
  if (!cleanDni) return { ok: false, reason: "not_found" };

  let memberName: string;

  const staff = await getGymStaffList();
  const staffMatch = staff.find((s) => s.dni === cleanDni);
  if (staffMatch) {
    memberName = staffMatch.name;
  } else {
    const payments = await getGymPaymentsFromSheet();
    if (!payments) return { ok: false, reason: "roster_unavailable" };
    // la planilla está en orden cronológico: la última fila con ese DNI es el pago más reciente
    const lastPayment = [...payments].reverse().find((p) => p.dni === cleanDni);
    if (!lastPayment) return { ok: false, reason: "not_found" };
    if (!Number.isFinite(lastPayment.daysRemaining) || lastPayment.daysRemaining <= 0) {
      return { ok: false, reason: "expired" };
    }
    memberName = lastPayment.name;
  }

  const monthKey = monthKeyFor(new Date());
  const used = await prisma.couponUse.findUnique({ where: { dni_monthKey: { dni: cleanDni, monthKey } } });
  if (used) return { ok: false, reason: "already_used" };

  return { ok: true, memberName, discountPercent: await getGymDiscountPercent() };
}

export const couponReasonLabel: Record<Exclude<CouponCheckResult, { ok: true }>["reason"], string> = {
  not_found: "Ese DNI no figura como socio de Fit Time.",
  expired: "Tu cuota de Fit Time está vencida.",
  already_used: "Ya usaste tu descuento de Fit Time este mes.",
  roster_unavailable: "No pudimos verificar el cupón en este momento, probá de nuevo en un rato.",
};
