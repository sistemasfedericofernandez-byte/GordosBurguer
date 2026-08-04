"use client";

import { useState } from "react";
import type { Order, MenuItem, Expense, Closure, Cadete, Settings, CartItem } from "@/lib/types";
import { money, todayKey, emptyTotals, accumulate, paymentLabel, deliveryLabel, amountToCollect } from "@/lib/domain";
import { printOrderTicket } from "@/lib/printer";

export default function CajaTab({
  orders, menu, closures, cadetes, settings, reload,
}: {
  orders: Order[]; menu: MenuItem[]; expenses: Expense[]; closures: Closure[]; cadetes: Cadete[]; settings: Settings; reload: () => Promise<void>;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<"efectivo" | "mercadopago" | "transferencia">("efectivo");
  const [delivery, setDelivery] = useState<"mostrador" | "retira" | "envio">("mostrador");
  const [address, setAddress] = useState("");
  const [cadeteId, setCadeteId] = useState("");
  const [tariff, setTariff] = useState(String(settings.defaultTariff || 0));
  const [tariffPaid, setTariffPaid] = useState(false);
  const [note, setNote] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closerName, setCloserName] = useState("");
  const [pinPrompt, setPinPrompt] = useState<{ orderId: string } | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");

  const today = todayKey();
  const todayOrders = orders.filter((o) => o.dateKey === today && o.confirmStatus === "confirmado").sort((a, b) => b.num - a.num);
  const todayTotals = todayOrders.reduce(accumulate, emptyTotals());
  const todayClosure = closures.find((c) => c.dateKey === today);
  const isClosed = !!todayClosure;

  const q = menuSearch.trim().toLowerCase();
  const filteredMenu = q
    ? menu.filter((m) => m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    : menu;
  const menuByCategory: Record<string, MenuItem[]> = {};
  filteredMenu.forEach((m) => { (menuByCategory[m.category] ||= []).push(m); });
  const categories = Object.keys(menuByCategory).sort((a, b) => (a === "Burgers" ? -1 : b === "Burgers" ? 1 : a.localeCompare(b)));

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === item.id);
      if (found) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };
  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0));
  };
  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const resetForm = () => {
    setCart([]); setCustomerName(""); setCustomerPhone(""); setPayment("efectivo"); setDelivery("mostrador");
    setAddress(""); setCadeteId(""); setTariff(String(settings.defaultTariff || 0)); setTariffPaid(false);
    setNote(""); setEditingOrderId(null);
  };

  const startEdit = (o: Order) => {
    setEditingOrderId(o.id);
    setCart(o.items.map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.qty })));
    setCustomerName(o.customerName); setCustomerPhone(o.customerPhone || ""); setPayment(o.payment); setDelivery(o.delivery);
    setAddress(o.delivery_?.address || ""); setCadeteId(o.delivery_?.cadeteId || "");
    setTariff(String(o.delivery_?.tariff ?? settings.defaultTariff ?? 0));
    setTariffPaid(!!o.delivery_?.tariffPaid);
    setNote(o.note);
  };

  const sendOrder = async () => {
    if (cart.length === 0 || isClosed) return;
    setSending(true);
    try {
      if (editingOrderId) {
        await fetch(`/api/orders/${editingOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart, customerName, customerPhone, payment, delivery, note }),
        });
        if (delivery === "envio" && (address || cadeteId)) {
          const existingDeliveryId = orders.find((o) => o.id === editingOrderId)?.delivery_?.id;
          if (existingDeliveryId) {
            await fetch(`/api/deliveries/${existingDeliveryId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address, cadeteId: cadeteId || null, tariff: parseFloat(tariff) || 0, tariffPaid }),
            });
          } else {
            await fetch(`/api/deliveries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: editingOrderId, address, cadeteId: cadeteId || null, tariff: parseFloat(tariff) || 0, tariffPaid }),
            });
          }
        }
      } else {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart, customerName, customerPhone, payment, delivery, note, address, cadeteId: cadeteId || null, tariff: parseFloat(tariff) || 0, tariffPaid }),
        });
        const order = await res.json();
        const collect = delivery === "envio" ? amountToCollect({ payment, total: cartTotal }, { tariff: parseFloat(tariff) || 0, tariffPaid }) : null;
        printOrderTicket({
          num: order.num, customerName, customerPhone, items: cart, total: cartTotal,
          delivery, note, createdAt: order.createdAt,
          collectLabel: collect?.label, collectAmount: collect?.amount,
        });
      }
      resetForm();
      await reload();
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async (o: Order) => {
    await fetch(`/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: o.status === "pendiente" ? "completado" : "pendiente" }),
    });
    await reload();
  };

  const askDelete = (orderId: string) => {
    setPinPrompt({ orderId }); setPinValue(""); setPinError("");
  };
  const confirmDelete = async () => {
    if (!pinPrompt) return;
    const res = await fetch(`/api/orders/${pinPrompt.orderId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinValue }),
    });
    if (res.ok) {
      if (editingOrderId === pinPrompt.orderId) resetForm();
      setPinPrompt(null);
      await reload();
    } else {
      setPinError("PIN incorrecto.");
    }
  };

  const closeCaja = async () => {
    const pendingCount = todayOrders.filter((o) => o.status === "pendiente").length;
    if (pendingCount > 0 && !confirm(`Hay ${pendingCount} pedido(s) pendiente(s). ¿Cerrar la caja igual?`)) return;
    await fetch("/api/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closedBy: closerName }),
    });
    await reload();
  };
  const reopenCaja = async () => {
    await fetch(`/api/closures/${today}`, { method: "DELETE" });
    await reload();
  };

  return (
    <div>
      <div className="stats-row">
        <div className="stat total"><div className="label">Total hoy</div><div className="value">{money(todayTotals.total)}</div></div>
        <div className="stat efectivo"><div className="label">Efectivo</div><div className="value">{money(todayTotals.efectivo)}</div></div>
        <div className="stat mp"><div className="label">Mercado Pago</div><div className="value">{money(todayTotals.mercadopago)}</div></div>
        <div className="stat transferencia"><div className="label">Transferencia</div><div className="value">{money(todayTotals.transferencia)}</div></div>
        <div className="stat"><div className="label">Pedidos</div><div className="value">{todayTotals.count}</div></div>
        <div className="stat envio"><div className="label">Envíos</div><div className="value">{todayTotals.envio}</div></div>
      </div>

      <div className={"closure-bar" + (isClosed ? " closed" : "")}>
        {isClosed ? (
          <>
            <div className="closure-info">
              <b>Caja cerrada</b> a las {new Date(todayClosure!.closedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              {todayClosure!.closedBy && <> por {todayClosure!.closedBy}</>}. Efectivo neto: <b>{money(todayClosure!.totals.efectivoNeto)}</b>
            </div>
            <button className="export-btn" onClick={reopenCaja}>Reabrir caja</button>
          </>
        ) : (
          <>
            <input type="text" placeholder="Cerrado por (opcional)" value={closerName} onChange={(e) => setCloserName(e.target.value)} />
            <button className="mini-btn" onClick={closeCaja}>Cerrar caja del día</button>
          </>
        )}
      </div>

      <div className="caja-grid">
        <div className="card">
          <h2>Menú</h2>
          <input type="text" placeholder="Buscar producto..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} style={{ marginBottom: 10 }} />
          {menu.length === 0 && <p className="empty-note">No hay productos. Agregalos en la pestaña Menú.</p>}
          {menu.length > 0 && categories.length === 0 && <p className="empty-note">Sin resultados para &quot;{menuSearch}&quot;.</p>}
          {categories.map((cat) => (
            <div key={cat}>
              <div className="cat-label">{cat}</div>
              {menuByCategory[cat].map((item) => (
                <div className="menu-item" key={item.id}>
                  <div>
                    <div className="name">{item.name}</div>
                    {item.desc && <div className="desc">{item.desc}</div>}
                    <div className="price">{money(item.price)}</div>
                  </div>
                  <button className="add-btn" disabled={isClosed} onClick={() => addToCart(item)}>+</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>{editingOrderId ? "Editando pedido" : "Pedido nuevo"}</h2>
          <input type="text" placeholder="Nombre cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input type="text" placeholder="Teléfono del cliente (opcional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ marginTop: 8 }} />

          <label className="field-label">Medio de pago</label>
          <div className="seg">
            <button className={payment === "efectivo" ? "active" : ""} onClick={() => setPayment("efectivo")}>Efectivo</button>
            <button className={"alt" + (payment === "mercadopago" ? " active" : "")} onClick={() => setPayment("mercadopago")}>Mercado Pago</button>
            <button className={"purp" + (payment === "transferencia" ? " active" : "")} onClick={() => setPayment("transferencia")}>Transferencia</button>
          </div>

          <label className="field-label">Entrega</label>
          <div className="seg">
            <button className={delivery === "mostrador" ? "active" : ""} onClick={() => setDelivery("mostrador")}>Mostrador</button>
            <button className={delivery === "retira" ? "active" : ""} onClick={() => setDelivery("retira")}>Retira</button>
            <button className={"ship" + (delivery === "envio" ? " active" : "")} onClick={() => setDelivery("envio")}>Envío</button>
          </div>

          {delivery === "envio" && (
            <>
              <label className="field-label">Dirección de entrega</label>
              <input type="text" placeholder="Calle, número, referencia" value={address} onChange={(e) => setAddress(e.target.value)} />
              <label className="field-label">Cadete (opcional, se puede asignar después)</label>
              <select value={cadeteId} onChange={(e) => setCadeteId(e.target.value)}>
                <option value="">Sin asignar</option>
                {cadetes.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="field-label">Tarifa de envío</label>
              <input type="number" value={tariff} onChange={(e) => setTariff(e.target.value)} />
              {payment !== "efectivo" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                  <input type="checkbox" checked={tariffPaid} onChange={(e) => setTariffPaid(e.target.checked)} style={{ width: "auto" }} />
                  El envío también se pagó (el cadete no cobra nada)
                </label>
              )}
            </>
          )}

          <label className="field-label">Nota (sin cebolla, etc.)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />

          {cart.length === 0 ? (
            <p className="empty-note" style={{ marginTop: 14 }}>Agregá productos del menú.</p>
          ) : (
            <div style={{ marginTop: 14 }}>
              {cart.map((c) => (
                <div className="ticket-line" key={c.id}>
                  <span>{c.name}</span>
                  <div className="qty-ctrl">
                    <button onClick={() => changeQty(c.id!, -1)}>−</button>
                    <span>{c.qty}</span>
                    <button onClick={() => changeQty(c.id!, 1)}>+</button>
                    <span>{money(c.price * c.qty)}</span>
                    <button className="rm" onClick={() => removeItem(c.id!)}>quitar</button>
                  </div>
                </div>
              ))}
              <div className="total-row"><span>Total</span><span>{money(cartTotal)}</span></div>
            </div>
          )}
          <button className="send-btn" disabled={cart.length === 0 || sending || isClosed} onClick={sendOrder}>
            {isClosed ? "Caja cerrada" : sending ? "Guardando..." : editingOrderId ? "Guardar cambios" : "Registrar venta"}
          </button>
          {editingOrderId && <button className="cancel-edit-btn" onClick={resetForm}>Cancelar edición</button>}
        </div>

        <div className="card">
          <h2>Pedidos de hoy ({todayOrders.length})</h2>
          {todayOrders.length === 0 && <p className="empty-note">Todavía no hay pedidos hoy.</p>}
          {todayOrders.map((o) => (
            <div className="order-row" key={o.id}>
              <div className="order-top">
                <div>
                  <div><strong>#{o.num}</strong>{o.customerName ? " · " + o.customerName : ""}{o.customerPhone ? " · " + o.customerPhone : ""} — {money(o.total)}</div>
                  <div className="meta">
                    <span className={"badge " + o.payment}>{paymentLabel(o.payment)}</span>
                    <span className={"badge " + o.delivery}>{deliveryLabel(o.delivery)}</span>
                    {" "}{new Date(o.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="meta">{o.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}</div>
                  {o.note && <div className="order-note">📝 {o.note}</div>}
                </div>
                <span className={o.status === "pendiente" ? "pending-tag" : "done-tag"}>{o.status}</span>
              </div>
              <div className="action-row">
                <button className="small-btn edit" onClick={() => startEdit(o)}>Editar</button>
                <button className={"small-btn " + (o.status === "pendiente" ? "done" : "undo")} onClick={() => toggleStatus(o)}>
                  {o.status === "pendiente" ? "Marcar listo" : "Reabrir"}
                </button>
                <button className="small-btn del" onClick={() => askDelete(o.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pinPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 320, width: "100%" }}>
            <h2>Ingresá el PIN para eliminar este pedido</h2>
            <p className="order-note">Esta acción no se puede deshacer.</p>
            <input type="text" inputMode="numeric" maxLength={4} value={pinValue} onChange={(e) => setPinValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDelete(); }} placeholder="PIN" style={{ textAlign: "center" }} autoFocus />
            {pinError && <p className="order-note" style={{ color: "var(--red)" }}>{pinError}</p>}
            <button className="send-btn" onClick={confirmDelete}>Confirmar</button>
            <button className="cancel-edit-btn" onClick={() => setPinPrompt(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
