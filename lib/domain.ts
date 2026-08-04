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
  { category: "Burgers", name: "Burguer Bacon + Papas", price: 5000, desc: "Pan de papa, medallón de carne 100g, queso cheddar, panceta, aderezo." },
  { category: "Burgers", name: "\"Paro Cardíaco\" + Papas", price: 8500, desc: "Pan de papa, doble medallón de carne 100g c/u, doble cheddar, panceta crocante, cebolla caramelizada, aderezo." },
  { category: "Burgers", name: "\"Triple Bypass\" + Papas", price: 10000, desc: "Pan de papa, triple medallón de carne 100g c/u, queso cheddar, panceta, huevo, alioli de ajo." },
  { category: "Burgers", name: "Burguer \"Infarto Fulminante\"", price: 9500, desc: "Pan de papa, doble medallón de carne 100g c/u, doble queso cheddar y roquefort, panceta, tomate, lechuga, huevo, aderezo." },
  { category: "Burgers", name: "Burguer \"Argento\"", price: 9000, desc: "Pan de papa, medallón de carne 100g, salsa criolla, chimichurri, huevo, aderezo." },
  { category: "Burgers", name: "Gordo's Bacon + Papas", price: 6500, desc: "Pan de papa, medallón de carne 100g, queso cheddar/dambo, panceta, huevo, aderezo." },
  { category: "Extras", name: "Aderezo Casero (Topin)", price: 2000, desc: "" },
  { category: "Extras", name: "Queso Cheddar (Topin)", price: 2500, desc: "" },
  { category: "Extras", name: "Queso Roquefort (Topin)", price: 2500, desc: "" },
  { category: "Extras", name: "Salsa Criolla (Topin)", price: 2500, desc: "" },
  { category: "Extras", name: "Gratinado", price: 4000, desc: "" },
  { category: "Promos", name: "3 Burguer Classic sin papas", price: 12000, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, queso dambo, aderezo." },
  { category: "Promos", name: "3 Burguer Especial sin papas", price: 14000, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, huevo, aderezo." },
  { category: "Promos", name: "3 Burguer Cheese sin papas", price: 10000, desc: "Pan de papa, medallón de carne 100g, queso cheddar, aderezo." },
  { category: "Promos", name: "3 Burguer Classic + Papas", price: 15000, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, queso dambo, aderezo." },
  { category: "Promos", name: "3 Burguer Especial + Papas", price: 17000, desc: "Pan de papa, medallón de carne 100g, lechuga, tomate, huevo, aderezo." },
  { category: "Promos", name: "3 Burguer Cheese + Papas", price: 13000, desc: "Pan de papa, medallón de carne 100g, queso cheddar, aderezo." },
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

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function telUrlFor(phone: string): string {
  const d = phoneDigits(phone);
  return d ? `tel:${d}` : "";
}

/** Heurística simple para Argentina: agrega 549 si no parece tener ya código de país. */
export function whatsappUrlFor(phone: string): string {
  let d = phoneDigits(phone);
  if (!d) return "";
  if (d.startsWith("54")) {
    if (!d.startsWith("549")) d = "549" + d.slice(2);
  } else {
    d = "549" + d.replace(/^0/, "");
  }
  return `https://wa.me/${d}`;
}

export type CollectInfo = { label: string; amount: number };

/** Qué debe cobrar el cadete al entregar, según cómo se pagó el pedido y si el envío ya está saldado. */
export function amountToCollect(
  order: { payment: string; total: number },
  delivery: { tariff: number; tariffPaid: boolean }
): CollectInfo {
  if (order.payment === "efectivo") {
    return { label: "Cobrar pedido + envío", amount: order.total + (delivery.tariff || 0) };
  }
  if (delivery.tariffPaid) {
    return { label: "Ya está todo pagado — solo entregar", amount: 0 };
  }
  return { label: "Cobrar solo el envío", amount: delivery.tariff || 0 };
}
