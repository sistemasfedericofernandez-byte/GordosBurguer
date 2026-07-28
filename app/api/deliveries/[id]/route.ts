import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapsUrlFor } from "@/lib/domain";
import { mirrorDelivery } from "@/lib/sheets";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/deliveries/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.cadeteId !== undefined) data.cadeteId = body.cadeteId || null;
  if (body.address !== undefined) {
    data.address = body.address;
    data.mapsUrl = mapsUrlFor(body.address);
  }
  if (body.tariff !== undefined) data.tariff = parseFloat(body.tariff);
  if (body.notes !== undefined) data.notes = body.notes;

  if (body.action === "depart") {
    data.status = "en_camino";
    data.departedAt = new Date();
  } else if (body.action === "deliver") {
    data.status = "entregado";
    data.deliveredAt = new Date();
  } else if (body.status !== undefined) {
    data.status = body.status;
  }

  const delivery = await prisma.delivery.update({
    where: { id },
    data,
    include: { order: true, cadete: true },
  });
  mirrorDelivery(delivery);
  return NextResponse.json(delivery);
}
