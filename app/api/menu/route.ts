import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MENU } from "@/lib/domain";
import { getMenuFromSheet, mirrorMenuItem } from "@/lib/sheets";

// El catálogo se lee en vivo de la hoja de Google Sheets si está configurada
// (así el dueño puede editar precios ahí y se reflejan solos en la app);
// si Sheets no está disponible, se usa Postgres como respaldo.
export async function GET() {
  const fromSheet = await getMenuFromSheet();
  if (fromSheet) {
    return NextResponse.json(fromSheet.filter((m) => m.active));
  }

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
  after(() => mirrorMenuItem(item));
  return NextResponse.json(item, { status: 201 });
}
