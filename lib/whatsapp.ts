const GRAPH_VERSION = "v21.0";

/** Envía un mensaje de texto por WhatsApp Cloud API. Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID. */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("Faltan WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID; no se envió el mensaje.");
    return;
  }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    console.error("Error enviando mensaje de WhatsApp:", await res.text());
  }
}
