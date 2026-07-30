"use client";

import { useState, useEffect } from "react";
import type { Settings } from "@/lib/types";
import { connectPrinter, tryReconnectPrinter, isPrinterConnected } from "@/lib/printer";

export default function ConfigTab({ settings, reload }: { settings: Settings; reload: () => Promise<void> }) {
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [tariff, setTariff] = useState(String(settings.defaultTariff || 0));
  const [tariffMsg, setTariffMsg] = useState("");
  const [businessInfo, setBusinessInfo] = useState(settings.businessInfo || "");
  const [businessInfoMsg, setBusinessInfoMsg] = useState("");
  const [businessWhatsapp, setBusinessWhatsapp] = useState(settings.businessWhatsapp || "");
  const [businessWhatsappMsg, setBusinessWhatsappMsg] = useState("");
  const [paymentAlias, setPaymentAlias] = useState(settings.paymentAlias || "");
  const [paymentAliasMsg, setPaymentAliasMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerMsg, setPrinterMsg] = useState("");
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

  useEffect(() => {
    tryReconnectPrinter().then((ok) => { if (ok) setPrinterConnected(true); });
  }, []);

  const handleConnectPrinter = async () => {
    const ok = await connectPrinter();
    setPrinterConnected(ok || isPrinterConnected());
    setPrinterMsg(ok ? "Impresora conectada." : "No se pudo conectar la impresora.");
  };

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

  const saveBusinessInfo = async () => {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessInfo }) });
    setBusinessInfoMsg("Información guardada.");
    await reload();
  };

  const saveBusinessWhatsapp = async () => {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessWhatsapp }) });
    setBusinessWhatsappMsg("Número guardado.");
    await reload();
  };

  const savePaymentAlias = async () => {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentAlias }) });
    setPaymentAliasMsg("Alias guardado.");
    await reload();
  };

  const copyOrderLink = () => {
    const url = `${window.location.origin}/pedir`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    });
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
        <h2>Página de pedidos para clientes</h2>
        <p className="empty-note">
          Mandale este link a los clientes por WhatsApp para que hagan su pedido directo (queda pendiente
          de tu confirmación en la pestaña Caja).
        </p>
        <button className="export-btn" style={{ marginTop: 10 }} onClick={copyOrderLink}>
          {copiedLink ? "¡Copiado!" : "Copiar link de pedidos"}
        </button>
        <label className="field-label">Número de WhatsApp del local (para el botón &quot;Volver a WhatsApp&quot;)</label>
        <input type="text" placeholder="Ej: 3794669197" value={businessWhatsapp} onChange={(e) => setBusinessWhatsapp(e.target.value)} />
        <button className="send-btn" style={{ marginTop: 10 }} onClick={saveBusinessWhatsapp}>Guardar número</button>
        {businessWhatsappMsg && <p className="order-note">{businessWhatsappMsg}</p>}
      </div>

      <div className="card">
        <h2>Alias para transferencias / Mercado Pago</h2>
        <p className="empty-note">Se incluye en el mensaje de confirmación por WhatsApp cuando el cliente eligió pagar con transferencia o Mercado Pago.</p>
        <input type="text" placeholder="Ej: licfede" value={paymentAlias} onChange={(e) => setPaymentAlias(e.target.value)} />
        <button className="send-btn" style={{ marginTop: 10 }} onClick={savePaymentAlias}>Guardar alias</button>
        {paymentAliasMsg && <p className="order-note">{paymentAliasMsg}</p>}
      </div>

      <div className="card">
        <h2>Bot de WhatsApp</h2>
        <p className="empty-note">
          Responde automáticamente horarios, precios, etc. y manda el link de pedidos si el cliente quiere pedir.
          Necesita que se carguen las variables de WhatsApp Business y Anthropic en Vercel (ver README) — mientras
          tanto queda inactivo sin romper nada.
        </p>
        <label className="field-label">Información del negocio (horarios, dirección, medios de pago...)</label>
        <textarea value={businessInfo} onChange={(e) => setBusinessInfo(e.target.value)} placeholder="Ej: Abrimos de miércoles a domingo de 20 a 00hs..." style={{ minHeight: 80 }} />
        <button className="send-btn" style={{ marginTop: 10 }} onClick={saveBusinessInfo}>Guardar información</button>
        {businessInfoMsg && <p className="order-note">{businessInfoMsg}</p>}
      </div>

      <div className="card">
        <h2>Impresora de comandas (58mm)</h2>
        <p className="empty-note">
          Conectá la impresora térmica USB una sola vez desde esta pantalla (Chrome o Edge). Si no hay
          impresora conectada, el ticket se imprime igual usando el diálogo de impresión del navegador.
        </p>
        <p className="order-note">{printerConnected ? "✅ Impresora conectada." : "Sin impresora conectada."}</p>
        <button className="export-btn" style={{ marginTop: 10 }} onClick={handleConnectPrinter}>Conectar impresora</button>
        {printerMsg && <p className="order-note">{printerMsg}</p>}
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
