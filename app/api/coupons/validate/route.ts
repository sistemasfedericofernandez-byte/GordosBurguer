import { NextRequest, NextResponse } from "next/server";
import { checkCoupon, couponReasonLabel } from "@/lib/coupons";
import { lastGymSheetError, lastGymSheetKeyInfo } from "@/lib/sheets";

// Solo para feedback visual antes de enviar el pedido — no tiene efectos secundarios
// (no registra el uso del cupón). La validación real y definitiva ocurre en
// POST /api/orders, que nunca confía en lo que mande el cliente acá.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const dni = typeof body.dni === "string" ? body.dni : "";
  const result = await checkCoupon(dni);
  if (result.ok) return NextResponse.json(result);
  return NextResponse.json({
    ...result,
    message: couponReasonLabel[result.reason],
    // TEMP: diagnóstico, sacar después
    debug: result.reason === "roster_unavailable" ? { error: lastGymSheetError, keyInfo: lastGymSheetKeyInfo } : undefined,
  });
}
