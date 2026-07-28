import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorOrder, mirrorOrderDeleted } from "@/lib/sheets";
import { checkPin } from "@/lib/auth";

type CartItem = { id?: string; name: string; price: number; qty: number };

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.items !== undefined) {
    const items: CartItem[] = body.items;
    data.items = items;
    data.total = items.reduce((s, it) => s + it.price * it.qty, 0);
  }
  if (body.customerName !== undefined) data.customerName = body.customerName;
  if (body.payment !== undefined) data.payment = body.payment;
  if (body.delivery !== undefined) data.delivery = body.delivery;
  if (body.note !== undefined) data.note = body.note;

  const order = await prisma.order.update({ where: { id }, data });
  after(() => mirrorOrder(order));
  return NextResponse.json(order);
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  if (!body.pin || !(await checkPin(body.pin))) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 403 });
  }
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

  await prisma.order.delete({ where: { id } });
  after(() => mirrorOrderDeleted(id));
  return NextResponse.json({ ok: true });
}
