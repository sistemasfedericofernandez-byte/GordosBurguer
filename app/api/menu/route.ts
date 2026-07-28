import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MENU } from "@/lib/domain";

export async function GET() {
  let items = await prisma.menuItem.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  if (items.length === 0) {
    await prisma.menuItem.createMany({ data: DEFAULT_MENU });
    items = await prisma.menuItem.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const price = parseFloat(body.price);
  if (!body.name?.trim() || !price || price <= 0) {
    return NextResponse.json({ error: "Nombre y precio son requeridos." }, { status: 400 });
  }
  const item = await prisma.menuItem.create({
    data: {
      name: body.name.trim(),
      price,
      category: body.category?.trim() || "Otros",
      desc: body.desc || "",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
