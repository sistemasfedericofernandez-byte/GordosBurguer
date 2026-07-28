"use client";

import { useState } from "react";
import type { Expense, Closure } from "@/lib/types";
import { EXPENSE_CATEGORIES, money, todayKey, fmtDate, paymentLabel, emptyExpenseTotals, accumulateExpense, toCsv } from "@/lib/domain";

function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function expenseRows(list: Expense[]) {
  const header = ["Fecha", "Hora", "Descripcion", "Categoria", "Cantidad", "Proveedor", "Pago", "Nota", "Monto"];
  const rows = list.map((e) => [
    e.dateKey,
    new Date(e.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    e.description, e.category, e.quantity || "", e.supplier || "", paymentLabel(e.payment), e.note || "", e.amount,
  ]);
  return [header, ...rows];
}

export default function ComprasTab({ expenses, closures, reload }: { expenses: Expense[]; closures: Closure[]; reload: () => Promise<void> }) {
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [payment, setPayment] = useState<"efectivo" | "mercadopago" | "transferencia">("efectivo");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const today = todayKey();
  const isClosed = closures.some((c) => c.dateKey === today);
  const todayExpenses = expenses.filter((e) => e.dateKey === today).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const todayTotals = todayExpenses.reduce(accumulateExpense, emptyExpenseTotals());
  const allTimeTotals = expenses.reduce(accumulateExpense, emptyExpenseTotals());

  const reset = () => {
    setDesc(""); setCategory(EXPENSE_CATEGORIES[0]); setQuantity(""); setSupplier("");
    setPayment("efectivo"); setNote(""); setAmount(""); setEditingId(null);
  };
  const startEdit = (e: Expense) => {
    setEditingId(e.id); setDesc(e.description); setCategory(e.category); setQuantity(e.quantity);
    setSupplier(e.supplier); setPayment(e.payment); setNote(e.note); setAmount(String(e.amount));
  };
  const save = async () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || !amt || amt <= 0 || isClosed) return;
    const body = { description: desc, category, quantity, supplier, payment, note, amount: amt };
    if (editingId) {
      await fetch(`/api/expenses/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    reset();
    await reload();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta compra?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    await reload();
  };

  const byDate: Record<string, Expense[]> = {};
  expenses.forEach((e) => { (byDate[e.dateKey] ||= []).push(e); });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const filteredDates = search.trim()
    ? sortedDates.filter((d) => {
        const q = search.trim().toLowerCase();
        return d.includes(q) || byDate[d].some((e) => e.description.toLowerCase().includes(q) || e.supplier.toLowerCase().includes(q));
      })
    : sortedDates;

  return (
    <div>
      <div className="stats-row">
        <div className="stat gasto"><div className="label">Total comprado</div><div className="value">{money(allTimeTotals.total)}</div></div>
        <div className="stat efectivo"><div className="label">Efectivo</div><div className="value">{money(allTimeTotals.efectivo)}</div></div>
        <div className="stat mp"><div className="label">Mercado Pago</div><div className="value">{money(allTimeTotals.mercadopago)}</div></div>
        <div className="stat transferencia"><div className="label">Transferencia</div><div className="value">{money(allTimeTotals.transferencia)}</div></div>
        <div className="stat"><div className="label">Compras totales</div><div className="value">{allTimeTotals.count}</div></div>
      </div>

      <div className="caja-grid">
        <div className="card">
          <h2>{editingId ? "Editando compra" : "Registrar compra de insumo"}</h2>
          <input type="text" placeholder="Descripción (ej: Carne picada)" value={desc} onChange={(e) => setDesc(e.target.value)} disabled={isClosed} />
          <label className="field-label">Categoría</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isClosed}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="field-row">
            <div>
              <label className="field-label">Cantidad</label>
              <input type="text" placeholder="ej: 5kg" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <label className="field-label">Proveedor</label>
              <input type="text" placeholder="Opcional" value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={isClosed} />
            </div>
          </div>
          <label className="field-label">Medio de pago</label>
          <div className="seg">
            <button className={payment === "efectivo" ? "active" : ""} onClick={() => setPayment("efectivo")} disabled={isClosed}>Efectivo</button>
            <button className={"alt" + (payment === "mercadopago" ? " active" : "")} onClick={() => setPayment("mercadopago")} disabled={isClosed}>Mercado Pago</button>
            <button className={"purp" + (payment === "transferencia" ? " active" : "")} onClick={() => setPayment("transferencia")} disabled={isClosed}>Transferencia</button>
          </div>
          <label className="field-label">Monto</label>
          <input type="number" placeholder="$" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isClosed} />
          <label className="field-label">Nota</label>
          <textarea placeholder="Opcional" value={note} onChange={(e) => setNote(e.target.value)} disabled={isClosed} />
          <button className="send-btn compra" disabled={isClosed} onClick={save}>
            {isClosed ? "Caja cerrada" : editingId ? "Guardar cambios" : "Registrar compra"}
          </button>
          {editingId && <button className="cancel-edit-btn" onClick={reset}>Cancelar edición</button>}
        </div>

        <div className="card">
          <h2>Compras de hoy ({money(todayTotals.total)})</h2>
          {todayExpenses.length === 0 && <p className="empty-note">Sin compras registradas hoy.</p>}
          {todayExpenses.map((e) => (
            <div className="order-row" key={e.id}>
              <div className="order-top">
                <div>
                  <div>{e.description} {e.quantity && <span style={{ color: "var(--muted)" }}>· {e.quantity}</span>} — {money(e.amount)}</div>
                  <div className="meta">
                    <span className="badge cat">{e.category}</span>
                    <span className={"badge " + e.payment}>{paymentLabel(e.payment)}</span>
                    {e.supplier && <span> · {e.supplier}</span>}
                  </div>
                  {e.note && <div className="order-note">📝 {e.note}</div>}
                </div>
              </div>
              <div className="action-row">
                <button className="small-btn edit" onClick={() => startEdit(e)}>Editar</button>
                <button className="small-btn del" onClick={() => remove(e.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hist-controls" style={{ marginTop: 20 }}>
        <input type="text" placeholder="Buscar fecha, insumo o proveedor" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="empty-note">{filteredDates.length} día(s) con compras</span>
        <button className="export-btn" onClick={() => downloadCsv("historial-compras.csv", expenseRows(expenses))}>Exportar todo (CSV)</button>
      </div>

      {filteredDates.length === 0 && <p className="empty-note">Todavía no registraste compras de insumos.</p>}

      {filteredDates.map((dateKey) => {
        const dayExpenses = byDate[dateKey].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const dayTotals = dayExpenses.reduce(accumulateExpense, emptyExpenseTotals());
        const isOpen = !!openDays[dateKey];
        return (
          <div className="day-group" key={dateKey}>
            <div className="day-head" onClick={() => setOpenDays((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))} style={{ cursor: "pointer" }}>
              <span className="date">{fmtDate(dateKey)} {isOpen ? "▾" : "▸"}</span>
              <span className="summary">
                {dayTotals.count} compras · {money(dayTotals.total)} · Efvo {money(dayTotals.efectivo)} · MP {money(dayTotals.mercadopago)} · Transf {money(dayTotals.transferencia)}
              </span>
            </div>
            {isOpen && (
              <div>
                <table>
                  <thead><tr><th>Hora</th><th>Descripción</th><th>Categoría</th><th>Cantidad</th><th>Proveedor</th><th>Pago</th><th>Nota</th><th>Monto</th></tr></thead>
                  <tbody>
                    {dayExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{e.description}</td>
                        <td>{e.category}</td>
                        <td>{e.quantity || "—"}</td>
                        <td>{e.supplier || "—"}</td>
                        <td>{paymentLabel(e.payment)}</td>
                        <td>{e.note || "—"}</td>
                        <td>{money(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="day-actions">
                  <button className="export-btn" onClick={() => downloadCsv(`compras-${dateKey}.csv`, expenseRows(dayExpenses))}>Exportar día (CSV)</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
