import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/closures/[dateKey]">) {
  const { dateKey } = await ctx.params;
  await prisma.closure.deleteMany({ where: { dateKey } });
  return NextResponse.json({ ok: true });
}
