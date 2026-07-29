import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey, mapsUrlFor } from "@/lib/domain";
import { mirrorOrder, mirrorDelivery } from "@/lib/sheets";
import { getDefaultTariff } from "@/lib/auth";

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
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const last = await prisma.order.findFirst({ orderBy: { num: "desc" } });
  const num = (last?.num || 0) + 1;
  const dateKey = todayKey();
  const source = body.source === "cliente" ? "cliente" : "staff";

  const order = await prisma.order.create({
    data: {
      num,
      dateKey,
      customerName: body.customerName || "",
      customerPhone: body.customerPhone || "",
      payment: body.payment || "efectivo",
      delivery: body.delivery || "mostrador",
      note: body.note || "",
      status: "pendiente",
      source,
      confirmStatus: source === "cliente" ? "pendiente" : "confirmado",
      total,
      items,
    },
  });

  after(() => mirrorOrder(order));

  if (order.delivery === "envio") {
    const address = body.address || "";
    const tariff = typeof body.tariff === "number" ? body.tariff : await getDefaultTariff();
    const deliveryRow = await prisma.delivery.create({
      data: {
        orderId: order.id,
        cadeteId: body.cadeteId || null,
        address,
        mapsUrl: mapsUrlFor(address),
        tariff,
        tariffPaid: !!body.tariffPaid,
      },
      include: { order: true, cadete: true },
    });
    after(() => mirrorDelivery(deliveryRow));
  }

  return NextResponse.json(order, { status: 201 });
}
