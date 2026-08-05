"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Order, MenuItem, Expense, Closure, Cadete, DeliveryInfo, Settings } from "@/lib/types";
import { money, amountToCollect, whatsappUrlFor, paymentLabel } from "@/lib/domain";
import { playBeep, unlockAudio } from "@/lib/beep";
import { printOrderTicket } from "@/lib/printer";
import CajaTab from "@/app/components/CajaTab";
import HistorialTab from "@/app/components/HistorialTab";
import ComprasTab from "@/app/components/ComprasTab";
import EnviosTab from "@/app/components/EnviosTab";
import MenuTab from "@/app/components/MenuTab";
import ConfigTab from "@/app/components/ConfigTab";

type View = "caja" | "historial" | "compras" | "envios" | "menu" | "config";

export default function App() {
  const [view, setView] = useState<View>("caja");
  const [loaded, setLoaded] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [cadetes, setCadetes] = useState<Cadete[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryInfo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const reloadAll = useCallback(async () => {
    const [o, m, e, c, cd, dv, s] = await Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/menu").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/closures").then((r) => r.json()),
      fetch("/api/cadetes").then((r) => r.json()),
      fetch("/api/deliveries").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]);
    setOrders(o);
    setMenu(m);
    setExpenses(e);
    setClosures(c);
    setCadetes(cd);
    setDeliveries(dv);
    setSettings(s);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    // Destraba el audio del navegador con el primer click en cualquier parte de la pantalla,
    // así el beep de pedidos nuevos puede sonar después aunque lo dispare el poll (sin click).
    const unlock = () => unlockAudio();
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/settings").then((r) => r.json()).then(setSettings);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const seenPendingIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const poll = async () => {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const fresh: Order[] = await res.json();
      setOrders(fresh);
      const pendingIds = new Set(fresh.filter((o) => o.source === "cliente" && o.confirmStatus === "pendiente").map((o) => o.id));
      if (seenPendingIds.current === null) {
        // primer poll: no suena por pedidos que ya estaban pendientes antes de abrir la pantalla
        seenPendingIds.current = pendingIds;
      } else {
        const isNew = [...pendingIds].some((id) => !seenPendingIds.current!.has(id));
        if (isNew) playBeep();
        seenPendingIds.current = pendingIds;
      }
    };
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  const confirmOrder = async (order: Order) => {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmStatus: "confirmado" }),
    });
    const collect = order.delivery === "envio"
      ? amountToCollect(order, { tariff: order.delivery_?.tariff || 0, tariffPaid: !!order.delivery_?.tariffPaid })
      : null;
    printOrderTicket({
      num: order.num, customerName: order.customerName, customerPhone: order.customerPhone,
      items: order.items, total: order.total, delivery: order.delivery, note: order.note, createdAt: order.createdAt,
      collectLabel: collect?.label, collectAmount: collect?.amount,
    });
    await reloadAll();
  };
  const notifyCustomerWhatsapp = async (order: Order) => {
    if (!order.customerPhone) { alert("Este pedido no tiene teléfono cargado."); return; }
    const isEnvio = order.delivery === "envio";

    const minutes = prompt("¿En cuántos minutos va a estar el pedido?", "30");
    if (minutes === null) return;

    let shippingCost: string | null = null;
    if (isEnvio) {
      shippingCost = prompt("¿Cuánto va a salir el envío?", String(order.delivery_?.tariff || ""));
      if (shippingCost === null) return;
      const tariffValue = parseFloat(shippingCost) || 0;
      if (order.delivery_?.id) {
        await fetch(`/api/deliveries/${order.delivery_.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tariff: tariffValue }),
        });
      }
    }

    const shippingValue = isEnvio ? (parseFloat(shippingCost || "0") || 0) : 0;
    const grandTotal = order.total + shippingValue;

    const itemsList = order.items.map((it) => `${it.qty}x ${it.name} — ${money(it.price * it.qty)}`).join("\n");
    const entregaLine = isEnvio
      ? `*Envío a:*${order.delivery_?.address ? ` ${order.delivery_.address}` : ""}`
      : "*Retira por el local*";
    const shippingLine = isEnvio && shippingCost ? `*Costo del envío:* ${money(shippingValue)}` : "";
    const aliasLine = order.payment !== "efectivo" && settings?.paymentAlias ? `*Alias para transferir:* ${settings.paymentAlias}` : "";
    const lines = [
      `¡Hola${order.customerName ? " " + order.customerName : ""}! Te confirmamos tu pedido #${order.num} en Gordo's Burger.`,
      "",
      "*Tu pedido:*",
      itemsList,
      "",
      entregaLine,
      shippingLine,
      `*Pago:* ${paymentLabel(order.payment)}`,
      aliasLine,
      `*Total:* ${money(grandTotal)}`,
      order.note ? `*Nota:* ${order.note}` : "",
      "",
      `Va a estar listo en aproximadamente ${minutes} minutos.`,
      "Si algo está mal (dirección, algún ítem, etc.) respondé este mensaje y lo corregimos. ¡Gracias por tu pedido!",
    ].filter(Boolean);
    const msg = lines.join("\n");
    window.open(`${whatsappUrlFor(order.customerPhone)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const rejectOrder = async (orderId: string) => {
    const reason = prompt("Motivo del rechazo (opcional):") || "";
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmStatus: "rechazado", rejectReason: reason }),
    });
    await reloadAll();
  };
  const pendingClientOrders = orders
    .filter((o) => o.source === "cliente" && o.confirmStatus === "pendiente")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const minutesAgo = (iso: string) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

  if (!loaded || !settings) {
    return <div className="loading">CARGANDO...</div>;
  }

  if (settings.expired) {
    return <TrialExpired onActivated={reloadAll} />;
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <div className="brand-text">
            <span className="name">Gordo&apos;s Burger</span>
            <span className="sub">Sistema de pedidos</span>
          </div>
        </div>
        <div className="tabs">
          <button className={"tab" + (view === "caja" ? " active" : "")} onClick={() => setView("caja")}>
            Caja de hoy{pendingClientOrders.length > 0 && ` 🔴${pendingClientOrders.length}`}
          </button>
          <button className={"tab" + (view === "historial" ? " active" : "")} onClick={() => setView("historial")}>Historial ventas</button>
          <button className={"tab" + (view === "compras" ? " active" : "")} onClick={() => setView("compras")}>Compras / Insumos</button>
          <button className={"tab" + (view === "envios" ? " active" : "")} onClick={() => setView("envios")}>Envíos</button>
          <button className={"tab" + (view === "menu" ? " active" : "")} onClick={() => setView("menu")}>Menú</button>
          <button className={"tab" + (view === "config" ? " active" : "")} onClick={() => setView("config")}>Configuración</button>
          <a className="tab" href="/cocina" target="_blank" rel="noopener noreferrer">Pantalla cocina ↗</a>
        </div>
      </div>

      {pendingClientOrders.length > 0 && (
        <div style={{ background: "var(--red)", padding: "10px 20px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto 8px", color: "white", fontWeight: "bold", fontSize: 13, letterSpacing: ".5px" }}>
            🔔 {pendingClientOrders.length} pedido{pendingClientOrders.length > 1 ? "s" : ""} esperando confirmación — el más viejo primero
          </div>
          {pendingClientOrders.map((o) => {
            const waitMin = minutesAgo(o.createdAt);
            return (
            <div key={o.id} className="card" style={{ background: "var(--panel)", marginBottom: 8, maxWidth: 700, marginLeft: "auto", marginRight: "auto", borderLeft: waitMin >= 5 ? "4px solid var(--red)" : "4px solid var(--mustard)" }}>
              <h2>🔔 Pedido nuevo del cliente #{o.num} <span style={{ fontWeight: "normal", fontSize: 11, color: waitMin >= 5 ? "var(--red)" : "var(--muted)" }}>hace {waitMin} min</span></h2>
              <div>{o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ""} — {money(o.total)}</div>
              <div className="meta" style={{ fontSize: 12, color: "var(--muted)" }}>{o.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}</div>
              {o.delivery === "envio" && <div className="meta" style={{ fontSize: 12 }}>Envío{o.delivery_?.address ? `: ${o.delivery_.address}` : ""}</div>}
              <div className="action-row" style={{ marginTop: 10 }}>
                <button className="small-btn done" onClick={() => confirmOrder(o)}>Confirmar</button>
                <button className="small-btn edit" style={{ background: "rgba(37,211,102,.15)", color: "#25D366", border: "1px solid #25D366" }} onClick={() => notifyCustomerWhatsapp(o)}>
                  📲 Avisar por WhatsApp
                </button>
                <button className="small-btn del" onClick={() => rejectOrder(o.id)}>Rechazar</button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <main>
        {view === "caja" && (
          <CajaTab orders={orders} menu={menu} expenses={expenses} closures={closures} cadetes={cadetes} settings={settings} reload={reloadAll} />
        )}
        {view === "historial" && <HistorialTab orders={orders} expenses={expenses} closures={closures} reload={reloadAll} />}
        {view === "compras" && <ComprasTab expenses={expenses} closures={closures} reload={reloadAll} />}
        {view === "envios" && <EnviosTab deliveries={deliveries} cadetes={cadetes} reload={reloadAll} />}
        {view === "menu" && <MenuTab menu={menu} reload={reloadAll} />}
        {view === "config" && <ConfigTab settings={settings} reload={reloadAll} />}
      </main>
    </div>
  );
}

function TrialExpired({ onActivated }: { onActivated: () => void }) {
  const [actInput, setActInput] = useState("");
  const [actError, setActError] = useState("");

  const activate = async () => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationKey: actInput.trim() }),
    });
    if (res.ok) {
      onActivated();
    } else {
      const data = await res.json().catch(() => ({}));
      setActError(data.error || "Clave incorrecta.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>⏳</div>
        <h2 style={{ color: "var(--paper)", display: "block", textAlign: "center" }}>Período de prueba finalizado</h2>
        <p className="order-note" style={{ textAlign: "center" }}>
          La prueba gratuita de este sistema terminó. Tus ventas, compras e historial <b>no se borraron</b>.
          Para seguir usándolo, contactá a quien te lo instaló para activarlo.
        </p>
        <label className="field-label">Clave de activación</label>
        <input
          type="text"
          value={actInput}
          onChange={(e) => setActInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") activate(); }}
          placeholder="Ingresá la clave"
          style={{ textAlign: "center" }}
        />
        {actError && <p className="order-note" style={{ color: "var(--red)", textAlign: "center" }}>{actError}</p>}
        <button className="send-btn" style={{ marginTop: 12 }} onClick={activate}>Activar</button>
      </div>
    </div>
  );
}
