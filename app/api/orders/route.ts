import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { todayKey, mapsUrlFor } from "@/lib/domain";
import { mirrorOrder, mirrorDelivery } from "@/lib/sheets";
import { getDefaultTariff } from "@/lib/auth";
import { resolveCadeteId } from "@/lib/cadetes";
import { checkCoupon, monthKeyFor } from "@/lib/coupons";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { delivery_: { include: { cadete: true } } },
  });
  return NextResponse.json(orders);
}

type CartItem = { id?: string; name: string; price: number; qty: number };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "El pedido no tiene productos." }, { status: 400 });
  }
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const dateKey = todayKey();
  const source = body.source === "cliente" ? "cliente" : "staff";
  const couponDni = typeof body.couponDni === "string" ? body.couponDni.trim() : "";

  // El servidor es la única fuente de verdad del descuento: nunca se confía en un
  // monto/porcentaje que mande el cliente, siempre se vuelve a validar acá.
  let discount = 0;
  let appliedCouponDni: string | null = null;
  let couponRejectedReason: string | null = null;
  if (couponDni) {
    const result = await checkCoupon(couponDni);
    if (result.ok) {
      discount = subtotal * (result.discountPercent / 100);
      appliedCouponDni = couponDni;
    } else {
      couponRejectedReason = result.reason;
    }
  }
  const total = subtotal - discount;

  const orderData = {
    dateKey,
    customerName: body.customerName || "",
    customerPhone: body.customerPhone || "",
    payment: body.payment || "efectivo",
    delivery: body.delivery || "mostrador",
    note: body.note || "",
    status: "pendiente",
    source,
    confirmStatus: source === "cliente" ? "pendiente" : "confirmado",
    items,
  };

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({ orderBy: { num: "desc" } });
      const num = (last?.num || 0) + 1;
      const created = await tx.order.create({
        data: { ...orderData, num, total, discount, couponDni: appliedCouponDni },
      });
      if (appliedCouponDni) {
        await tx.couponUse.create({
          data: { dni: appliedCouponDni, monthKey: monthKeyFor(new Date()), orderId: created.id, discount },
        });
      }
      return created;
    });
  } catch (err) {
    // Carrera: dos pedidos con el mismo DNI de cupón en el mismo mes llegaron casi
    // juntos y el segundo perdió la carrera por el @@unique([dni, monthKey]). Nunca
    // bloqueamos la venta por esto — se crea el pedido igual, sin el descuento.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      couponRejectedReason = "already_used";
      const last = await prisma.order.findFirst({ orderBy: { num: "desc" } });
      const num = (last?.num || 0) + 1;
      order = await prisma.order.create({
        data: { ...orderData, num, total: subtotal, discount: 0, couponDni: null },
      });
    } else {
      throw err;
    }
  }

  after(() => mirrorOrder(order));

  if (order.delivery === "envio") {
    const address = body.address || "";
    const tariff = typeof body.tariff === "number" ? body.tariff : await getDefaultTariff();
    const deliveryRow = await prisma.delivery.create({
      data: {
        orderId: order.id,
        cadeteId: await resolveCadeteId(body.cadeteId),
        address,
        mapsUrl: mapsUrlFor(address),
        tariff,
        tariffPaid: !!body.tariffPaid,
      },
      include: { order: true, cadete: true },
    });
    after(() => mirrorDelivery(deliveryRow));
  }

  return NextResponse.json({ ...order, couponRejectedReason }, { status: 201 });
}
