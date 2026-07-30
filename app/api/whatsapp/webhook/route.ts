import { NextRequest, NextResponse, after } from "next/server";
import { getBusinessInfo } from "@/lib/auth";
import { generateBotReply } from "@/lib/openaiBot";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getActiveMenu } from "@/lib/menu";

// Handshake de verificación que pide Meta al configurar el webhook.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida." }, { status: 403 });
}

type WhatsAppMessage = { from: string; type: string; text?: { body: string } };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const messages: WhatsAppMessage[] =
    body?.entry?.[0]?.changes?.[0]?.value?.messages || [];

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.text?.body) continue;
    after(() => handleIncomingMessage(msg.from, msg.text!.body));
  }

  // WhatsApp espera un 200 rápido; el procesamiento real sigue en segundo plano (after()).
  return NextResponse.json({ ok: true });
}

async function handleIncomingMessage(from: string, text: string): Promise<void> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://menu-pora.vercel.app";
  const [businessInfo, menu] = await Promise.all([getBusinessInfo(), getActiveMenu()]);
  const reply = await generateBotReply(text, businessInfo, `${origin}/pedir`, menu);
  await sendWhatsAppMessage(from, reply);
}
