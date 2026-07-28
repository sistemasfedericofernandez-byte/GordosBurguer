import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorCadete } from "@/lib/sheets";

export async function GET() {
  const cadetes = await prisma.cadete.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(cadetes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
  }
  const cadete = await prisma.cadete.create({
    data: { name: body.name.trim(), phone: body.phone || "" },
  });
  mirrorCadete(cadete);
  return NextResponse.json(cadete, { status: 201 });
}
