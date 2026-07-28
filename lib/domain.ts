export type CartItem = { id: string; name: string; price: number; qty: number };

export type OrderTotals = {
  total: number;
  efectivo: number;
  mercadopago: number;
  transferencia: number;
  count: number;
  envio: number;
  retira: number;
  mostrador: number;
};

export type ExpenseTotals = {
  total: number;
  efectivo: number;
  mercadopago: number;
  transferencia: number;
  count: number;
};

export const EXPENSE_CATEGORIES = [
  "Carnes",
  "Verduras y frutas",
  "Pan y panificados",
  "Bebidas",
  "Limpieza",
  "Descartables",
  "Servicios",
  "Otros",
];

export const DEFAULT_MENU = [
  { category: "Burgers", name: "Burguer Classic + Papas", price: 4500, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, queso dambo, aderezo." },
  { category: "Burgers", name: "Burguer Especial + Papas", price: 6000, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, huevo, aderezo." },
  { category: "Burgers", name: "Burguer Cheese + Papas", price: 4000, desc: "Pan de papa, medallón de carne 100g, queso cheddar, aderezo." },
  { category: "Burgers", name: "Burguer Bacon + Papas", price: 5000, desc: "Pan de papa, medallón de carne 100g, queso cheddar/dambo, panceta, huevo, aderezo." },
  { category: "Extras", name: "Aderezo Casero (Topin)", price: 2000, desc: "" },
  { category: "Extras", name: "Queso Cheddar (Topin)", price: 2500, desc: "" },
];

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(key: string): string {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function paymentLabel(p: string): string {
  return p === "efectivo" ? "Efectivo" : p === "mercadopago" ? "Mercado Pago" : "Transferencia";
}

export function deliveryLabel(d: string): string {
  return d === "envio" ? "Envío" : d === "retira" ? "Retira" : "Mostrador";
}

export function emptyTotals(): OrderTotals {
  return { total: 0, efectivo: 0, mercadopago: 0, transferencia: 0, count: 0, envio: 0, retira: 0, mostrador: 0 };
}

export function accumulate(t: OrderTotals, o: { total: number; payment: string; delivery: string }): OrderTotals {
  t.total += o.total;
  t.count += 1;
  if (o.payment === "efectivo") t.efectivo += o.total;
  if (o.payment === "mercadopago") t.mercadopago += o.total;
  if (o.payment === "transferencia") t.transferencia += o.total;
  if (o.delivery === "envio") t.envio += 1;
  if (o.delivery === "retira") t.retira += 1;
  if (o.delivery === "mostrador") t.mostrador += 1;
  return t;
}

export function emptyExpenseTotals(): ExpenseTotals {
  return { total: 0, efectivo: 0, mercadopago: 0, transferencia: 0, count: 0 };
}

export function accumulateExpense(t: ExpenseTotals, e: { amount: number; payment: string }): ExpenseTotals {
  t.total += e.amount;
  t.count += 1;
  if (e.payment === "efectivo") t.efectivo += e.amount;
  if (e.payment === "mercadopago") t.mercadopago += e.amount;
  if (e.payment === "transferencia") t.transferencia += e.amount;
  return t;
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function mapsUrlFor(address: string): string {
  if (!address.trim()) return "";
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address.trim());
}
