"use client";

import { useState } from "react";
import type { Cadete, DeliveryInfo } from "@/lib/types";
import { money } from "@/lib/domain";

const statusLabel: Record<string, string> = { pendiente: "Pendiente", en_camino: "En camino", entregado: "Entregado" };

export default function EnviosTab({ deliveries, cadetes, reload }: { deliveries: DeliveryInfo[]; cadetes: Cadete[]; reload: () => Promise<void> }) {
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addCadete = async () => {
    if (!newName.trim()) return;
    await fetch("/api/cadetes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, phone: newPhone }) });
    setNewName(""); setNewPhone("");
    await reload();
  };
  const toggleActive = async (c: Cadete) => {
    await fetch(`/api/cadetes/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    await reload();
  };
  const assignCadete = async (deliveryId: string, cadeteId: string) => {
    await fetch(`/api/deliveries/${deliveryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cadeteId: cadeteId || null }) });
    await reload();
  };
  const copyLink = (c: Cadete) => {
    const url = `${window.location.origin}/cadete/${c.accessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const active = deliveries.filter((d) => d.status !== "entregado");
  const done = deliveries.filter((d) => d.status === "entregado").slice(0, 30);

  const byCadete: Record<string, DeliveryInfo[]> = { sin_asignar: [] };
  active.forEach((d) => { const key = d.cadeteId || "sin_asignar"; (byCadete[key] ||= []).push(d); });

  return (
    <div>
      <div className="caja-grid">
        <div className="card">
          <h2>Cadetes</h2>
          {cadetes.length === 0 && <p className="empty-note">Todavía no cargaste cadetes.</p>}
          {cadetes.map((c) => (
            <div className="menu-edit-row" key={c.id}>
              <div style={{ flex: 2, minWidth: 120 }}>
                <div>{c.name} {!c.active && <span className="badge cat">Inactivo</span>}</div>
                {c.phone && <div className="desc" style={{ color: "var(--muted)", fontSize: 11 }}>{c.phone}</div>}
              </div>
              <button className="small-btn edit" onClick={() => copyLink(c)}>{copiedId === c.id ? "¡Copiado!" : "Copiar link"}</button>
              <button className="small-btn del" onClick={() => toggleActive(c)}>{c.active ? "Desactivar" : "Activar"}</button>
            </div>
          ))}
          <div className="new-item-form">
            <input type="text" placeholder="Nombre del cadete" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input type="text" placeholder="Teléfono (opcional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <button className="mini-btn" onClick={addCadete}>Agregar</button>
          </div>
        </div>

        <div className="card">
          <h2>Sin asignar ({byCadete.sin_asignar.length})</h2>
          {byCadete.sin_asignar.length === 0 && <p className="empty-note">No hay envíos pendientes de asignar.</p>}
          {byCadete.sin_asignar.map((d) => (
            <DeliveryRow key={d.id} d={d} cadetes={cadetes} onAssign={assignCadete} />
          ))}
        </div>

        {cadetes
          .filter((c) => c.active || (byCadete[c.id] || []).length > 0)
          .map((c) => (
            <div className="card" key={c.id}>
              <h2>{c.name}{!c.active && " (inactivo)"} ({(byCadete[c.id] || []).length})</h2>
              {(byCadete[c.id] || []).length === 0 && <p className="empty-note">Sin entregas activas.</p>}
              {(byCadete[c.id] || []).map((d) => (
                <DeliveryRow key={d.id} d={d} cadetes={cadetes} onAssign={assignCadete} />
              ))}
            </div>
          ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Últimas entregas completadas</h2>
        {done.length === 0 && <p className="empty-note">Todavía no hay entregas completadas.</p>}
        {done.map((d) => (
          <div className="order-row" key={d.id}>
            <div className="order-top">
              <div>
                <div>Pedido #{d.order?.num} — {d.cadete?.name || "sin cadete"} — {money(d.tariff)}</div>
                <div className="meta">{d.address}</div>
                <div className="meta">
                  {d.departedAt && <>Salió {new Date(d.departedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · </>}
                  {d.deliveredAt && <>Entregó {new Date(d.deliveredAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</>}
                </div>
              </div>
              <span className="done-tag">{statusLabel[d.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryRow({ d, cadetes, onAssign }: { d: DeliveryInfo; cadetes: Cadete[]; onAssign: (id: string, cadeteId: string) => void }) {
  return (
    <div className="order-row">
      <div className="order-top">
        <div>
          <div>Pedido #{d.order?.num} — {money(d.tariff)}</div>
          <div className="meta">{d.address || "Sin dirección cargada"}</div>
        </div>
        <span className={d.status === "en_camino" ? "pending-tag" : "done-tag"}>{statusLabel[d.status]}</span>
      </div>
      <div className="action-row">
        <select value={d.cadeteId || ""} onChange={(e) => onAssign(d.id, e.target.value)}>
          <option value="">Sin asignar</option>
          {cadetes.filter((c) => c.active || c.id === d.cadeteId).map((c) => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactivo)" : ""}</option>)}
        </select>
        {d.mapsUrl && (
          <a className="small-btn maps" href={d.mapsUrl} target="_blank" rel="noopener noreferrer">Abrir en Maps</a>
        )}
      </div>
    </div>
  );
}
