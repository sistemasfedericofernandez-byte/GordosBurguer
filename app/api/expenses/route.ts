import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/domain";
import { mirrorExpense } from "@/lib/sheets";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const amount = parseFloat(body.amount);
  if (!body.description?.trim() || !amount || amount <= 0) {
    return NextResponse.json({ error: "Descripción y monto son requeridos." }, { status: 400 });
  }
  const expense = await prisma.expense.create({
    data: {
      description: body.description.trim(),
      category: body.category || "Otros",
      quantity: body.quantity || "",
      supplier: body.supplier || "",
      payment: body.payment || "efectivo",
      note: body.note || "",
      amount,
      dateKey: todayKey(),
    },
  });
  after(() => mirrorExpense(expense));
  return NextResponse.json(expense, { status: 201 });
}
