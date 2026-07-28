import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorCadete } from "@/lib/sheets";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/cadetes/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.active !== undefined) data.active = !!body.active;
  const cadete = await prisma.cadete.update({ where: { id }, data });
  mirrorCadete(cadete);
  return NextResponse.json(cadete);
}

// Baja lógica: un cadete puede tener envíos históricos asociados, no se borra la fila.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/cadetes/[id]">) {
  const { id } = await ctx.params;
  const cadete = await prisma.cadete.update({ where: { id }, data: { active: false } });
  mirrorCadete(cadete);
  return NextResponse.json({ ok: true });
}
