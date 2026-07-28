import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorMenuItem, mirrorMarkDeleted } from "@/lib/sheets";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/menu/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.price !== undefined) data.price = parseFloat(body.price);
  if (body.category !== undefined) data.category = body.category.trim() || "Otros";
  if (body.desc !== undefined) data.desc = body.desc;

  try {
    const item = await prisma.menuItem.update({ where: { id }, data });
    after(() => mirrorMenuItem(item));
    return NextResponse.json(item);
  } catch {
    // No existe en Postgres: el ítem se administra directo en la hoja de Sheets.
    const merged = {
      id,
      category: (body.category || "Otros").trim() || "Otros",
      name: (body.name || "").trim(),
      price: parseFloat(body.price) || 0,
      desc: body.desc || "",
      active: true,
    };
    await mirrorMenuItem(merged);
    return NextResponse.json(merged);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/menu/[id]">) {
  const { id } = await ctx.params;
  try {
    await prisma.menuItem.update({ where: { id }, data: { active: false } });
  } catch {
    // No existe en Postgres: se administra directo en la hoja.
  }
  after(() => mirrorMarkDeleted("menu", id, 5, "No"));
  return NextResponse.json({ ok: true });
}
