import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey, emptyTotals, accumulate, emptyExpenseTotals, accumulateExpense } from "@/lib/domain";
import { mirrorClosure } from "@/lib/sheets";

export async function GET() {
  const closures = await prisma.closure.findMany({ orderBy: { dateKey: "desc" } });
  return NextResponse.json(closures);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const dateKey = todayKey();

  const existing = await prisma.closure.findUnique({ where: { dateKey } });
  if (existing) return NextResponse.json({ error: "La caja de hoy ya está cerrada." }, { status: 400 });

  const [orders, expenses] = await Promise.all([
    prisma.order.findMany({ where: { dateKey } }),
    prisma.expense.findMany({ where: { dateKey } }),
  ]);
  const totals = orders.reduce(accumulate, emptyTotals());
  const expenseTotals = expenses.reduce(accumulateExpense, emptyExpenseTotals());
  const efectivoNeto = totals.efectivo - expenseTotals.efectivo;

  const closure = await prisma.closure.create({
    data: {
      dateKey,
      closedBy: body.closedBy || "",
      totals: { ...totals, gastos: expenseTotals.total, efectivoNeto },
    },
  });
  after(() => mirrorClosure(closure));
  return NextResponse.json(closure, { status: 201 });
}
