"use client";

import { useEffect, useState, useCallback } from "react";
import type { MenuItem, CartItem } from "@/lib/types";
import { money } from "@/lib/domain";

export default function PedirClient() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<"efectivo" | "mercadopago" | "transferencia">("efectivo");
  const [delivery, setDelivery] = useState<"retira" | "envio">("retira");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentOrderNum, setSentOrderNum] = useState<number | null>(null);

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/menu");
    setMenu(await res.json());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar
    loadMenu();
  }, [loadMenu]);

  const q = menuSearch.trim().toLowerCase();
  const filteredMenu = q ? menu.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : menu;
  const byCategory: Record<string, MenuItem[]> = {};
  filteredMenu.forEach((m) => { (byCategory[m.category] ||= []).push(m); });
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));

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

  const canSubmit = cart.length > 0 && customerName.trim() && customerPhone.trim() && (delivery !== "envio" || address.trim());

  const submitOrder = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart, customerName, customerPhone, payment, delivery, note, address,
          source: "cliente",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo enviar el pedido. Probá de nuevo.");
        return;
      }
      const order = await res.json();
      setSentOrderNum(order.num);
    } finally {
      setSending(false);
    }
  };

  if (sentOrderNum !== null) {
    return (
      <div className="cadete-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <h2 style={{ color: "var(--paper)" }}>¡Pedido enviado!</h2>
          <p className="order-note" style={{ textAlign: "center" }}>
            Tu pedido <b>#{sentOrderNum}</b> ya está en revisión. Te contactamos en breve para confirmarlo.
          </p>
        </div>
      </div>
    );
  }

  if (!loaded) return <div className="cadete-shell"><p className="loading">Cargando...</p></div>;

  return (
    <div className="cadete-shell" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 className="display" style={{ color: "var(--mustard)", fontSize: 26, marginBottom: 4 }}>Menú Porá</h1>
      <p className="empty-note" style={{ marginBottom: 16 }}>Armá tu pedido y lo confirmamos apenas lo veamos.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Menú</h2>
        <input type="text" placeholder="Buscar producto..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} style={{ marginBottom: 10 }} />
        {menu.length === 0 && <p className="empty-note">El menú no está disponible por ahora.</p>}
        {categories.map((cat) => (
          <div key={cat}>
            <div className="cat-label">{cat}</div>
            {byCategory[cat].map((item) => (
              <div className="menu-item" key={item.id}>
                <div>
                  <div className="name">{item.name}</div>
                  {item.desc && <div className="desc">{item.desc}</div>}
                  <div className="price">{money(item.price)}</div>
                </div>
                <button className="add-btn" onClick={() => addToCart(item)}>+</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Tu carrito</h2>
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

      <div className="card">
        <h2>Tus datos</h2>
        <input type="text" placeholder="Tu nombre" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input type="tel" placeholder="Tu teléfono" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ marginTop: 8 }} />

        <label className="field-label">Medio de pago</label>
        <div className="seg">
          <button className={payment === "efectivo" ? "active" : ""} onClick={() => setPayment("efectivo")}>Efectivo</button>
          <button className={"alt" + (payment === "mercadopago" ? " active" : "")} onClick={() => setPayment("mercadopago")}>Mercado Pago</button>
          <button className={"purp" + (payment === "transferencia" ? " active" : "")} onClick={() => setPayment("transferencia")}>Transferencia</button>
        </div>

        <label className="field-label">Entrega</label>
        <div className="seg">
          <button className={delivery === "retira" ? "active" : ""} onClick={() => setDelivery("retira")}>Retira</button>
          <button className={"ship" + (delivery === "envio" ? " active" : "")} onClick={() => setDelivery("envio")}>Envío</button>
        </div>

        {delivery === "envio" && (
          <>
            <label className="field-label">Dirección de entrega</label>
            <input type="text" placeholder="Calle, número, referencia" value={address} onChange={(e) => setAddress(e.target.value)} />
          </>
        )}

        <label className="field-label">Nota (sin cebolla, etc.)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />

        {error && <p className="order-note" style={{ color: "var(--red)" }}>{error}</p>}

        <button className="send-btn" disabled={!canSubmit || sending} onClick={submitOrder}>
          {sending ? "Enviando..." : "Enviar pedido"}
        </button>
      </div>
    </div>
  );
}
