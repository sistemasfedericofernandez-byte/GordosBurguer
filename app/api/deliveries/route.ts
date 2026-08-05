import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapsUrlFor } from "@/lib/domain";
import { mirrorDelivery } from "@/lib/sheets";
import { getDefaultTariff } from "@/lib/auth";
import { resolveCadeteId } from "@/lib/cadetes";

export async function GET() {
  const deliveries = await prisma.delivery.findMany({
    include: { order: true, cadete: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deliveries);
}

// Alta manual para un pedido de envío que todavía no tiene registro de entrega
// (por ejemplo, si el pedido se editó de "mostrador"/"retira" a "envío" después de creado).
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.orderId) return NextResponse.json({ error: "Falta el pedido." }, { status: 400 });

  const existing = await prisma.delivery.findUnique({ where: { orderId: body.orderId } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const address = body.address || "";
  const delivery = await prisma.delivery.create({
    data: {
      orderId: body.orderId,
      cadeteId: await resolveCadeteId(body.cadeteId),
      address,
      mapsUrl: mapsUrlFor(address),
      tariff: typeof body.tariff === "number" ? body.tariff : await getDefaultTariff(),
      tariffPaid: !!body.tariffPaid,
    },
    include: { order: true, cadete: true },
  });
  after(() => mirrorDelivery(delivery));
  return NextResponse.json(delivery, { status: 201 });
}
