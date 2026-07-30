import { prisma } from "@/lib/prisma";

export function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export function isValidPin(p: string): boolean {
  return /^\d{4}$/.test(p);
}

const DEFAULT_PIN_HASH = simpleHash("1234");

// Vence 7 dias despues de la entrega: 5 de julio de 2026, 22:00
export const TRIAL_DEADLINE = new Date(2026, 6, 5, 22, 0, 0).getTime();
export const ACTIVATION_HASH = simpleHash("GORDOS-PAGO-2026");

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getPinHash(): Promise<string> {
  return (await getSetting("pinHash")) ?? DEFAULT_PIN_HASH;
}

export async function setPinHash(newPin: string): Promise<void> {
  await setSetting("pinHash", simpleHash(newPin));
}

export async function checkPin(pin: string): Promise<boolean> {
  return simpleHash(pin) === (await getPinHash());
}

export async function isActivated(): Promise<boolean> {
  return (await getSetting("activated")) === "true";
}

export async function checkActivationKey(key: string): Promise<boolean> {
  const ok = simpleHash(key) === ACTIVATION_HASH;
  if (ok) await setSetting("activated", "true");
  return ok;
}

export async function isExpired(): Promise<boolean> {
  if (await isActivated()) return false;
  return Date.now() > TRIAL_DEADLINE;
}

export async function getDefaultTariff(): Promise<number> {
  const v = await getSetting("defaultTariff");
  return v ? parseFloat(v) : 0;
}

export async function setDefaultTariff(value: number): Promise<void> {
  await setSetting("defaultTariff", String(value));
}

const DEFAULT_BUSINESS_INFO = "Horarios: consultar. Ubicación: consultar. Formas de pago: efectivo, Mercado Pago, transferencia.";

export async function getBusinessInfo(): Promise<string> {
  return (await getSetting("businessInfo")) ?? DEFAULT_BUSINESS_INFO;
}

export async function setBusinessInfo(value: string): Promise<void> {
  await setSetting("businessInfo", value);
}

export async function getBusinessWhatsapp(): Promise<string> {
  return (await getSetting("businessWhatsapp")) ?? "";
}

export async function setBusinessWhatsapp(value: string): Promise<void> {
  await setSetting("businessWhatsapp", value);
}
