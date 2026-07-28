"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

export default function ConfigTab({ settings, reload }: { settings: Settings; reload: () => Promise<void> }) {
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [tariff, setTariff] = useState(String(settings.defaultTariff || 0));
  const [tariffMsg, setTariffMsg] = useState("");
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

  const changePin = async () => {
    if (newPin !== confirmPin) { setPinMsg("La confirmación no coincide con el PIN nuevo."); return; }
    const res = await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: curPin, newPin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPinMsg("PIN actualizado correctamente.");
      setCurPin(""); setNewPin(""); setConfirmPin("");
    } else {
      setPinMsg(data.error || "No se pudo actualizar el PIN.");
    }
  };

  const saveTariff = async () => {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defaultTariff: parseFloat(tariff) || 0 }) });
    setTariffMsg("Tarifa por defecto actualizada.");
    await reload();
  };

  return (
    <div className="caja-grid">
      <div className="card">
        <h2>Cambiar PIN</h2>
        <label className="field-label">PIN actual</label>
        <input type="text" inputMode="numeric" maxLength={4} value={curPin} onChange={(e) => setCurPin(e.target.value)} />
        <label className="field-label">PIN nuevo</label>
        <input type="text" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
        <label className="field-label">Confirmar PIN nuevo</label>
        <input type="text" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
        <button className="send-btn" onClick={changePin}>Guardar PIN</button>
        {pinMsg && <p className="order-note">{pinMsg}</p>}
      </div>

      <div className="card">
        <h2>Tarifa de envío por defecto</h2>
        <p className="empty-note">Se precarga en cada pedido de envío nuevo; se puede editar por pedido.</p>
        <input type="number" value={tariff} onChange={(e) => setTariff(e.target.value)} />
        <button className="send-btn" style={{ marginTop: 10 }} onClick={saveTariff}>Guardar tarifa</button>
        {tariffMsg && <p className="order-note">{tariffMsg}</p>}
      </div>

      <div className="card">
        <h2>Estado de la licencia</h2>
        <p className="order-note">{settings.activated ? "Sistema activado." : "En período de prueba."}</p>
        {!settings.activated && (
          <p className="empty-note">Vence el {new Date(settings.trialDeadline).toLocaleDateString("es-AR")}.</p>
        )}
      </div>

      <div className="card">
        <h2>Respaldo en Google Sheets</h2>
        <p className="empty-note">
          Cada pedido, compra, cierre y envío se guarda automáticamente en una planilla de Google Sheets,
          para que tengas acceso a tu historial aunque el sistema esté caído.
        </p>
        {sheetUrl ? (
          <a className="export-btn" style={{ display: "inline-block", marginTop: 10 }} href={sheetUrl} target="_blank" rel="noopener noreferrer">Abrir planilla</a>
        ) : (
          <p className="empty-note">Configurá NEXT_PUBLIC_GOOGLE_SHEET_URL para mostrar acá el link directo.</p>
        )}
      </div>
    </div>
  );
}
