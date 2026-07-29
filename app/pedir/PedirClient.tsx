"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MenuItem, CartItem } from "@/lib/types";
import { money } from "@/lib/domain";

const PALETTE = ["var(--mustard)", "var(--red)", "var(--green)", "var(--blue)", "var(--purple)"];

function categoryEmoji(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("empanada")) return "🥟";
  if (c.includes("pizza")) return "🍕";
  if (c.includes("hamburguesa")) return "🍔";
  if (c.includes("milanesa")) return "🍖";
  if (c.includes("lomito") || c.includes("pan frances")) return "🥪";
  if (c.includes("papa")) return "🍟";
  if (c.includes("bebida")) return "🥤";
  if (c.includes("postre")) return "🍰";
  return "🍽️";
}

export default function PedirClient() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCat, setActiveCat] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<"efectivo" | "mercadopago" | "transferencia">("efectivo");
  const [delivery, setDelivery] = useState<"retira" | "envio">("retira");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentOrderNum, setSentOrderNum] = useState<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/menu");
    const data = await res.json();
    setMenu(data);
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

  const effectiveActiveCat = activeCat || categories[0] || "";

  const scrollToCategory = (cat: string) => {
    setActiveCat(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
  const qtyInCart = (id: string) => cart.find((c) => c.id === id)?.qty || 0;
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

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
      <div className="pedir-app" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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

  if (!loaded) return <div className="pedir-app"><p className="loading">Cargando...</p></div>;

  return (
    <div className="pedir-app">
      <div className="pedir-header">
        <div className="brand-name">Menú Porá</div>
        <div className="brand-tagline">Armá tu pedido y lo confirmamos en breve</div>
        <input type="text" placeholder="🔍 Buscar producto..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} />
      </div>

      {categories.length > 1 && (
        <div className="pedir-catnav">
          {categories.map((cat) => (
            <button key={cat} className={effectiveActiveCat === cat ? "active" : ""} onClick={() => scrollToCategory(cat)}>
              {categoryEmoji(cat)} {cat}
            </button>
          ))}
        </div>
      )}

      {menu.length === 0 && <p className="empty-note" style={{ padding: 20, textAlign: "center" }}>El menú no está disponible por ahora.</p>}

      {categories.map((cat, catIdx) => (
        <section key={cat} className="pedir-section" ref={(el) => { sectionRefs.current[cat] = el; }}>
          <h2>{categoryEmoji(cat)} {cat}</h2>
          {byCategory[cat].map((item) => {
            const inCart = qtyInCart(item.id);
            return (
              <div className="pedir-card" key={item.id}>
                <div className="pedir-thumb" style={{ background: PALETTE[catIdx % PALETTE.length], opacity: 0.9 }}>
                  {categoryEmoji(cat)}
                </div>
                <div className="pedir-card-body">
                  <div className="name">{item.name}</div>
                  {item.desc && <div className="desc">{item.desc}</div>}
                  <div className="price">{money(item.price)}</div>
                </div>
                {inCart > 0 ? (
                  <div className="pedir-qty">
                    <button onClick={() => changeQty(item.id, -1)}>−</button>
                    <span>{inCart}</span>
                    <button onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                ) : (
                  <button className="pedir-add-btn" onClick={() => addToCart(item)}>+</button>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {cart.length > 0 && !cartOpen && (
        <button className="pedir-cartbar" onClick={() => setCartOpen(true)}>
          <span>🛒 {cartCount} {cartCount === 1 ? "ítem" : "ítems"}</span>
          <span>{money(cartTotal)} · Ver carrito ›</span>
        </button>
      )}

      {cartOpen && (
        <div className="pedir-overlay" onClick={() => setCartOpen(false)}>
          <div className="pedir-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="pedir-drawer-handle" />
            <button className="pedir-close" onClick={() => setCartOpen(false)}>✕</button>
            <h2>Tu pedido</h2>
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

            <div style={{ marginTop: 18 }}>
              <label className="field-label">Tu nombre</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <label className="field-label">Tu teléfono</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

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
                {sending ? "Enviando..." : `Enviar pedido · ${money(cartTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
