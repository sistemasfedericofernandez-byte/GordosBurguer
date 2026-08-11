"use client";

import { useState } from "react";
import type { Order, Expense, Closure } from "@/lib/types";
import { money, fmtDate, emptyTotals, accumulate, paymentLabel, deliveryLabel, toCsv } from "@/lib/domain";

function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function orderRows(list: Order[]) {
  const header = ["Fecha", "Hora", "Numero", "Cliente", "Telefono", "Items", "Pago", "Entrega", "Nota", "Estado", "Total", "Descuento", "DNI Cupon"];
  const rows = list.map((o) => [
    o.dateKey,
    new Date(o.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    o.num, o.customerName || "", o.customerPhone || "",
    o.items.map((it) => `${it.qty}x ${it.name}`).join(" | "),
    paymentLabel(o.payment), deliveryLabel(o.delivery), o.note || "", o.status, o.total,
    o.discount || 0, o.couponDni || "",
  ]);
  return [header, ...rows];
}

export default function HistorialTab({ orders: allOrders, expenses }: { orders: Order[]; expenses: Expense[]; closures: Closure[]; reload: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const orders = allOrders.filter((o) => o.confirmStatus === "confirmado");
  const allTimeTotals = orders.reduce(accumulate, emptyTotals());
  const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);

  const byDate: Record<string, Order[]> = {};
  orders.forEach((o) => { (byDate[o.dateKey] ||= []).push(o); });
  const byDateExpTotal: Record<string, number> = {};
  expenses.forEach((e) => { byDateExpTotal[e.dateKey] = (byDateExpTotal[e.dateKey] || 0) + e.amount; });

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const filteredDates = search.trim()
    ? sortedDates.filter((d) => d.includes(search.trim()) || fmtDate(d).toLowerCase().includes(search.trim().toLowerCase()))
    : sortedDates;

  return (
    <div>
      <div className="stats-row">
        <div className="stat total"><div className="label">Total histórico</div><div className="value">{money(allTimeTotals.total)}</div></div>
        <div className="stat efectivo"><div className="label">Efectivo</div><div className="value">{money(allTimeTotals.efectivo)}</div></div>
        <div className="stat mp"><div className="label">Mercado Pago</div><div className="value">{money(allTimeTotals.mercadopago)}</div></div>
        <div className="stat"><div className="label">Pedidos totales</div><div className="value">{allTimeTotals.count}</div></div>
        <div className="stat envio"><div className="label">Envíos</div><div className="value">{allTimeTotals.envio}</div></div>
        <div className="stat"><div className="label">Retira</div><div className="value">{allTimeTotals.retira}</div></div>
        <div className="stat transferencia"><div className="label">Descuentos Fit Time</div><div className="value">{money(totalDiscount)}</div></div>
      </div>

      <div className="hist-controls">
        <input type="text" placeholder="Buscar fecha (ej: 2026-06)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="empty-note">{filteredDates.length} día(s) con ventas</span>
        <button className="export-btn" onClick={() => downloadCsv("historial-ventas.csv", orderRows(orders))}>Exportar todo (CSV)</button>
      </div>

      {filteredDates.length === 0 && <p className="empty-note">Sin registros todavía.</p>}

      {filteredDates.map((dateKey) => {
        const dayOrders = byDate[dateKey].sort((a, b) => b.num - a.num);
        const dayTotals = dayOrders.reduce(accumulate, emptyTotals());
        const dayExpTotal = byDateExpTotal[dateKey] || 0;
        const isOpen = !!openDays[dateKey];
        return (
          <div className="day-group" key={dateKey}>
            <div className="day-head" onClick={() => setOpenDays((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))} style={{ cursor: "pointer" }}>
              <span className="date">{fmtDate(dateKey)} {isOpen ? "▾" : "▸"}</span>
              <span className="summary">
                {dayTotals.count} pedidos · {money(dayTotals.total)} · Efvo {money(dayTotals.efectivo)} · MP {money(dayTotals.mercadopago)} · Compras {money(dayExpTotal)} · Envíos {dayTotals.envio} · Retira {dayTotals.retira}
              </span>
            </div>
            {isOpen && (
              <div>
                <table>
                  <thead><tr><th>Hora</th><th>#</th><th>Cliente</th><th>Items</th><th>Pago</th><th>Entrega</th><th>Estado</th><th>Total</th></tr></thead>
                  <tbody>
                    {dayOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{o.num}</td>
                        <td>{o.customerName || "—"}</td>
                        <td>{o.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}</td>
                        <td>{paymentLabel(o.payment)}</td>
                        <td>{deliveryLabel(o.delivery)}</td>
                        <td>{o.status}</td>
                        <td>{money(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="day-actions">
                  <button className="export-btn" onClick={() => downloadCsv(`ventas-${dateKey}.csv`, orderRows(dayOrders))}>Exportar día (CSV)</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
