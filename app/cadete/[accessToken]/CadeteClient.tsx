"use client";

import { useEffect, useState, useCallback } from "react";
import type { DeliveryInfo } from "@/lib/types";
import { money, telUrlFor, whatsappUrlFor, amountToCollect } from "@/lib/domain";

export default function CadeteClient({ accessToken }: { accessToken: string }) {
  const [name, setName] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryInfo[]>([]);
  const [history, setHistory] = useState<DeliveryInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [addressDrafts, setAddressDrafts] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cadetes/track/${accessToken}`, { cache: "no-store" });
    if (!res.ok) { setNotFound(true); setLoaded(true); return; }
    const data = await res.json();
    setName(data.cadete.name);
    setDeliveries(data.deliveries);
    setHistory(data.history || []);
    setLoaded(true);
  }, [accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const patch = async (deliveryId: string, body: Record<string, unknown>) => {
    await fetch(`/api/cadetes/track/${accessToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, ...body }),
    });
    load();
  };

  const saveAddress = (d: DeliveryInfo) => {
    const address = addressDrafts[d.id];
    if (address === undefined || !address.trim()) return;
    patch(d.id, { address });
  };

  if (!loaded) return <div className="cadete-shell"><p className="loading">Cargando...</p></div>;
  if (notFound) return <div className="cadete-shell"><p className="loading">Link inválido.</p></div>;

  return (
    <div className="cadete-shell">
      <h1 className="display" style={{ color: "var(--mustard)", fontSize: 22, marginBottom: 14 }}>Ronda de {name}</h1>
      {deliveries.length === 0 && <p className="empty-note">No tenés entregas asignadas por ahora.</p>}
      {deliveries.map((d) => {
        const order = d.order;
        const collect = order ? amountToCollect(order, d) : null;
        const phone = order?.customerPhone || "";
        return (
          <div className="cadete-card" key={d.id}>
            <div><strong>Pedido #{order?.num}</strong> · Total {money(order?.total || 0)}</div>
            {order?.customerName && <div className="addr">Cliente: {order.customerName}</div>}
            {order && order.items.length > 0 && (
              <div className="addr" style={{ fontSize: 12, color: "var(--muted)" }}>
                {order.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
              </div>
            )}

            {collect && (
              <div className="order-note" style={{ marginTop: 8, fontSize: 13 }}>
                {collect.amount > 0 ? <>💵 {collect.label}: <strong>{money(collect.amount)}</strong></> : <>✅ {collect.label}</>}
              </div>
            )}

            {d.address ? (
              <div className="addr">📍 {d.address}</div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label className="field-label">Cargar dirección de entrega</label>
                <input
                  type="text"
                  placeholder="Calle, número, referencia"
                  value={addressDrafts[d.id] ?? ""}
                  onChange={(e) => setAddressDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                />
                <button className="mini-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => saveAddress(d)}>Guardar dirección</button>
              </div>
            )}

            <div className="cadete-actions">
              {d.mapsUrl && <a className="btn-maps" href={d.mapsUrl} target="_blank" rel="noopener noreferrer">📍 Maps</a>}
              {phone && <a className="btn-maps" style={{ background: "var(--green)" }} href={telUrlFor(phone)}>📞 Llamar</a>}
              {phone && <a className="btn-maps" style={{ background: "#25D366" }} href={whatsappUrlFor(phone)} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>}
              {d.status === "pendiente" && (
                <button className="btn-depart" onClick={() => patch(d.id, { action: "depart" })}>Salí</button>
              )}
              {d.status !== "entregado" && (
                <button className="btn-deliver" onClick={() => patch(d.id, { action: "deliver" })}>✓ Entregué</button>
              )}
            </div>
          </div>
        );
      })}

      <button className="cancel-edit-btn" style={{ marginTop: 10 }} onClick={() => setShowHistory((v) => !v)}>
        {showHistory ? "Ocultar historial" : "Ver historial de entregas"}
      </button>
      {showHistory && (
        <div style={{ marginTop: 10 }}>
          {history.length === 0 && <p className="empty-note">Todavía no tenés entregas completadas.</p>}
          {history.map((d) => (
            <div className="cadete-card" key={d.id}>
              <div>Pedido #{d.order?.num} · {money(d.tariff)}</div>
              <div className="addr" style={{ fontSize: 12 }}>{d.address}</div>
              <div className="addr" style={{ fontSize: 11, color: "var(--muted)" }}>
                {d.deliveredAt && new Date(d.deliveredAt).toLocaleString("es-AR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
