"use client";

import { useEffect, useState, useCallback } from "react";
import type { Order } from "@/lib/types";

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    const data: Order[] = await res.json();
    setOrders(data.filter((o) => o.status === "pendiente" && o.confirmStatus === "confirmado").sort((a, b) => a.num - b.num));
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const marcarListo = async (id: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completado" }),
    });
    load();
  };

  if (!loaded) return <div className="loading">CARGANDO...</div>;

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <div className="brand-text">
            <span className="name">Gordo&apos;s Burger</span>
            <span className="sub">Pantalla de cocina</span>
          </div>
        </div>
      </div>
      <main>
        {orders.length === 0 ? (
          <p className="loading">No hay pedidos pendientes 🎉</p>
        ) : (
          <div className="cocina-grid">
            {orders.map((o) => (
              <div className="cocina-card" key={o.id}>
                <div className="num">#{o.num}{o.customerName ? ` · ${o.customerName}` : ""}</div>
                <div className="items">
                  {o.items.map((it) => (
                    <div key={it.id}>{it.qty}× {it.name}</div>
                  ))}
                </div>
                {o.note && <div className="order-note">📝 {o.note}</div>}
                <button onClick={() => marcarListo(o.id)}>Listo</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
