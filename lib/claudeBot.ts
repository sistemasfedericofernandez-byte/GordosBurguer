import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/**
 * Genera la respuesta del bot de WhatsApp con Claude. `orderPageUrl` se le pasa siempre al
 * modelo para que lo comparta cuando el cliente quiera hacer un pedido.
 */
export async function generateBotReply(userMessage: string, businessInfo: string, orderPageUrl: string): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    return `Gracias por tu mensaje. Para hacer un pedido entrá acá: ${orderPageUrl}`;
  }

  const systemPrompt = [
    "Sos el asistente de WhatsApp de una hamburguesería/restaurante llamado Menú Porá.",
    "Respondé siempre en español rioplatense, corto y directo (2-4 líneas máximo), como un mensaje de WhatsApp real.",
    "Información del negocio (horarios, ubicación, medios de pago, etc.):",
    businessInfo,
    "",
    `Si el cliente quiere hacer un pedido, pide el menú/la carta, o pregunta precios de productos específicos, pasale este link para que pida directo ahí: ${orderPageUrl}`,
    "No inventes precios ni productos que no estén en la información de arriba: si preguntan por un precio puntual, mandalos al link de la carta.",
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : `Para hacer tu pedido entrá acá: ${orderPageUrl}`;
  } catch (err) {
    console.error("Error generando respuesta con Claude:", err);
    return `Gracias por tu mensaje. Para hacer un pedido entrá acá: ${orderPageUrl}`;
  }
}
