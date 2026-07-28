"use client";

import { useEffect, useState, useCallback } from "react";
import type { Order, MenuItem, Expense, Closure, Cadete, DeliveryInfo, Settings } from "@/lib/types";
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
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/settings").then((r) => r.json()).then(setSettings);
    }, 60000);
    return () => clearInterval(id);
  }, []);

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
            <span className="name">GORDO&apos;S</span>
            <span className="sub">Sistema de pedidos</span>
          </div>
        </div>
        <div className="tabs">
          <button className={"tab" + (view === "caja" ? " active" : "")} onClick={() => setView("caja")}>Caja de hoy</button>
          <button className={"tab" + (view === "historial" ? " active" : "")} onClick={() => setView("historial")}>Historial ventas</button>
          <button className={"tab" + (view === "compras" ? " active" : "")} onClick={() => setView("compras")}>Compras / Insumos</button>
          <button className={"tab" + (view === "envios" ? " active" : "")} onClick={() => setView("envios")}>Envíos</button>
          <button className={"tab" + (view === "menu" ? " active" : "")} onClick={() => setView("menu")}>Menú</button>
          <button className={"tab" + (view === "config" ? " active" : "")} onClick={() => setView("config")}>Configuración</button>
          <a className="tab" href="/cocina" target="_blank" rel="noopener noreferrer">Pantalla cocina ↗</a>
        </div>
      </div>

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
