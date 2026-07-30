import Anthropic from "@anthropic-ai/sdk";
import type { MenuItem } from "@/lib/types";
import { money } from "@/lib/domain";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

function formatCatalog(menu: MenuItem[]): string {
  if (menu.length === 0) return "(sin productos cargados)";
  const byCategory = new Map<string, MenuItem[]>();
  for (const item of menu) {
    const list = byCategory.get(item.category) || [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const blocks: string[] = [];
  for (const [category, items] of byCategory) {
    const lines = items.map((it) => `- ${it.name}: ${money(it.price)}${it.desc ? ` (${it.desc})` : ""}`);
    blocks.push(`${category}:\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

/**
 * Genera la respuesta del bot de WhatsApp con Claude. `orderPageUrl` se le pasa siempre al
 * modelo para que lo comparta cuando el cliente quiera hacer un pedido, y `menu` es el
 * catálogo activo (leído en vivo de la base/Sheet) para que responda precios reales y
 * actualizados sin necesidad de cargarlos a mano.
 */
export async function generateBotReply(
  userMessage: string,
  businessInfo: string,
  orderPageUrl: string,
  menu: MenuItem[]
): Promise<string> {
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
    "Carta actual con precios (es la fuente de verdad, se actualiza sola — usala siempre que pregunten por productos o precios):",
    formatCatalog(menu),
    "",
    `Si el cliente quiere hacer un pedido, pasale este link para que pida directo ahí: ${orderPageUrl}`,
    "No inventes precios ni productos que no estén en la carta de arriba. Si preguntan por algo que no está, decí que no lo tenés.",
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
