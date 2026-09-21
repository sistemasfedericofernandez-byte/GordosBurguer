"use client";

import type { Order, Expense } from "@/lib/types";
import { money, fmtDate, emptyTotals, accumulate, emptyExpenseTotals, accumulateExpense } from "@/lib/domain";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * Total vendido desde el primer pedido del sistema. A diferencia de "Total hoy" de la Caja, esto
 * NUNCA se pone en cero: no depende de los cierres de caja, suma todos los pedidos confirmados.
 */
export default function AcumuladoTab({ orders, expenses }: { orders: Order[]; expenses: Expense[] }) {
  const confirmed = orders.filter((o) => o.confirmStatus === "confirmado");
  const totals = confirmed.reduce(accumulate, emptyTotals());
  const expenseTotals = expenses.reduce(accumulateExpense, emptyExpenseTotals());
  const totalDiscount = confirmed.reduce((s, o) => s + (o.discount || 0), 0);
  const firstDay = confirmed.length > 0 ? confirmed.reduce((min, o) => (o.dateKey < min ? o.dateKey : min), confirmed[0].dateKey) : null;
  const daysWithSales = new Set(confirmed.map((o) => o.dateKey)).size;

  const byMonth: Record<string, { count: number; total: number }> = {};
  confirmed.forEach((o) => {
    const key = o.dateKey.slice(0, 7);
    const row = (byMonth[key] ||= { count: 0, total: 0 });
    row.count += 1;
    row.total += o.total;
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="card cierre-resumen" style={{ marginBottom: 16 }}>
        <h2>Total acumulado desde el inicio</h2>
        <div className="cierre-total">
          <span className="label">Vendido en total{firstDay ? ` desde el ${fmtDate(firstDay)}` : ""}</span>
          <span className="value">{money(totals.total)}</span>
        </div>
        <p className="order-note" style={{ marginTop: 10 }}>
          {totals.count} pedidos confirmados en {daysWithSales} día(s) con ventas. Este número no se reinicia con el cierre de caja.
        </p>
      </div>

      <div className="stats-row">
        <div className="stat efectivo"><div className="label">Efectivo</div><div className="value">{money(totals.efectivo)}</div></div>
        <div className="stat mp"><div className="label">Mercado Pago</div><div className="value">{money(totals.mercadopago)}</div></div>
        <div className="stat transferencia"><div className="label">Transferencia</div><div className="value">{money(totals.transferencia)}</div></div>
        <div className="stat envio"><div className="label">Envíos</div><div className="value">{totals.envio}</div></div>
        <div className="stat"><div className="label">Retira</div><div className="value">{totals.retira}</div></div>
        <div className="stat"><div className="label">Mostrador</div><div className="value">{totals.mostrador}</div></div>
        <div className="stat gasto"><div className="label">Compras / insumos</div><div className="value">{money(expenseTotals.total)}</div></div>
        <div className="stat total"><div className="label">Ventas − compras</div><div className="value">{money(totals.total - expenseTotals.total)}</div></div>
        <div className="stat transferencia"><div className="label">Descuentos Fit Time</div><div className="value">{money(totalDiscount)}</div></div>
      </div>

      <div className="card">
        <h2>Por mes</h2>
        {months.length === 0 && <p className="empty-note">Todavía no hay ventas.</p>}
        {months.length > 0 && (
          <table>
            <thead><tr><th>Mes</th><th>Pedidos</th><th>Vendido</th></tr></thead>
            <tbody>
              {months.map((k) => (
                <tr key={k}>
                  <td>{monthLabel(k)}</td>
                  <td>{byMonth[k].count}</td>
                  <td>{money(byMonth[k].total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
