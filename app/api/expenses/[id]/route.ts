import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorExpense, mirrorExpenseDeleted } from "@/lib/sheets";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/expenses/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.description !== undefined) data.description = body.description.trim();
  if (body.category !== undefined) data.category = body.category;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.supplier !== undefined) data.supplier = body.supplier;
  if (body.payment !== undefined) data.payment = body.payment;
  if (body.note !== undefined) data.note = body.note;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  const expense = await prisma.expense.update({ where: { id }, data });
  after(() => mirrorExpense(expense));
  return NextResponse.json(expense);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/expenses/[id]">) {
  const { id } = await ctx.params;
  await prisma.expense.delete({ where: { id } });
  after(() => mirrorExpenseDeleted(id));
  return NextResponse.json({ ok: true });
}
