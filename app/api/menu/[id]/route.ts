import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/menu/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.price !== undefined) data.price = parseFloat(body.price);
  if (body.category !== undefined) data.category = body.category.trim() || "Otros";
  if (body.desc !== undefined) data.desc = body.desc;
  const item = await prisma.menuItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/menu/[id]">) {
  const { id } = await ctx.params;
  await prisma.menuItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
