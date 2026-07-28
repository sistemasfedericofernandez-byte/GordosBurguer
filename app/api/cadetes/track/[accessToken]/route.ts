import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapsUrlFor } from "@/lib/domain";
import { mirrorDelivery } from "@/lib/sheets";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/cadetes/track/[accessToken]">) {
  const { accessToken } = await ctx.params;
  const cadete = await prisma.cadete.findUnique({ where: { accessToken } });
  if (!cadete) return NextResponse.json({ error: "Link inválido." }, { status: 404 });

  const [deliveries, history] = await Promise.all([
    prisma.delivery.findMany({
      where: { cadeteId: cadete.id, status: { not: "entregado" } },
      include: { order: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.delivery.findMany({
      where: { cadeteId: cadete.id, status: "entregado" },
      include: { order: true },
      orderBy: { deliveredAt: "desc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({ cadete: { name: cadete.name }, deliveries, history });
}

// El propio cadete carga/edita su dirección o marca "Salí" / "Entregué" para una de sus paradas.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/cadetes/track/[accessToken]">) {
  const { accessToken } = await ctx.params;
  const cadete = await prisma.cadete.findUnique({ where: { accessToken } });
  if (!cadete) return NextResponse.json({ error: "Link inválido." }, { status: 404 });

  const body = await request.json();
  const delivery = await prisma.delivery.findUnique({ where: { id: body.deliveryId } });
  if (!delivery || delivery.cadeteId !== cadete.id) {
    return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.address !== undefined) {
    data.address = body.address;
    data.mapsUrl = mapsUrlFor(body.address);
  }
  if (body.action === "depart") {
    data.status = "en_camino";
    data.departedAt = new Date();
  } else if (body.action === "deliver") {
    data.status = "entregado";
    data.deliveredAt = new Date();
  }

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data,
    include: { order: true, cadete: true },
  });
  after(() => mirrorDelivery(updated));
  return NextResponse.json(updated);
}
